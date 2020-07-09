/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extname } from 'path';
import { chunk, omit } from 'lodash/fp';

import uuid from 'uuid';
import { createPromiseFromStreams } from '../../../../../../../src/legacy/utils';
import { IRouter } from '../../../../../../../src/core/server';

import { TIMELINE_IMPORT_URL } from '../../../../common/constants';
import { validate } from '../../../../common/validate';

import { SetupPlugins } from '../../../plugin';
import { ConfigType } from '../../../config';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { importRulesSchema } from '../../../../common/detection_engine/schemas/response/import_rules_schema';
import {
  buildSiemResponse,
  createBulkErrorObject,
  BulkError,
  transformError,
} from '../../detection_engine/routes/utils';

import { createTimelinesStreamFromNdJson } from '../create_timelines_stream_from_ndjson';

import { ImportTimelinesPayloadSchemaRt } from './schemas/import_timelines_schema';
import {
  buildFrameworkRequest,
  CompareTimelinesStatus,
  TimelineStatusActions,
} from './utils/common';
import {
  getTupleDuplicateErrorsAndUniqueTimeline,
  isBulkError,
  isImportRegular,
  ImportTimelineResponse,
  ImportTimelinesSchema,
  PromiseFromStreams,
  timelineSavedObjectOmittedFields,
} from './utils/import_timelines';
import { createTimelines } from './utils/create_timelines';
import { TimelineStatus } from '../../../../common/types/timeline';

const CHUNK_PARSED_OBJECT_SIZE = 10;
const DEFAULT_IMPORT_ERROR = `Something has gone wrong. We didn't handle something properly. To help us fix this, please upload your file to https://discuss.elastic.co/c/security/siem.`;

export const importTimelinesRoute = (
  router: IRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.post(
    {
      path: `${TIMELINE_IMPORT_URL}`,
      validate: {
        body: buildRouteValidation(ImportTimelinesPayloadSchemaRt),
      },
      options: {
        tags: ['access:securitySolution'],
        body: {
          maxBytes: config.maxTimelineImportPayloadBytes,
          output: 'stream',
        },
      },
    },
    async (context, request, response) => {
      try {
        const siemResponse = buildSiemResponse(response);
        const savedObjectsClient = context.core.savedObjects.client;
        if (!savedObjectsClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const { file } = request.body;
        const { filename } = file.hapi;

        const fileExtension = extname(filename).toLowerCase();

        if (fileExtension !== '.ndjson') {
          return siemResponse.error({
            statusCode: 400,
            body: `Invalid file extension ${fileExtension}`,
          });
        }

        const objectLimit = config.maxTimelineImportExportSize;

        const readStream = createTimelinesStreamFromNdJson(objectLimit);
        const parsedObjects = await createPromiseFromStreams<PromiseFromStreams[]>([
          file,
          ...readStream,
        ]);
        const [duplicateIdErrors, uniqueParsedObjects] = getTupleDuplicateErrorsAndUniqueTimeline(
          parsedObjects,
          false
        );
        const chunkParseObjects = chunk(CHUNK_PARSED_OBJECT_SIZE, uniqueParsedObjects);
        let importTimelineResponse: ImportTimelineResponse[] = [];

        const frameworkRequest = await buildFrameworkRequest(context, security, request);

        while (chunkParseObjects.length) {
          const batchParseObjects = chunkParseObjects.shift() ?? [];
          const newImportTimelineResponse = await Promise.all(
            batchParseObjects.reduce<Array<Promise<ImportTimelineResponse>>>(
              (accum, parsedTimeline) => {
                const importsWorkerPromise = new Promise<ImportTimelineResponse>(
                  async (resolve, reject) => {
                    if (parsedTimeline instanceof Error) {
                      // If the JSON object had a validation or parse error then we return
                      // early with the error and an (unknown) for the ruleId
                      resolve(
                        createBulkErrorObject({
                          statusCode: 400,
                          message: parsedTimeline.message,
                        })
                      );

                      return null;
                    }

                    const {
                      savedObjectId,
                      pinnedEventIds,
                      globalNotes,
                      eventNotes,
                      status,
                      templateTimelineId,
                      templateTimelineVersion,
                      title,
                      timelineType,
                      version,
                    } = parsedTimeline;
                    const parsedTimelineObject = omit(
                      timelineSavedObjectOmittedFields,
                      parsedTimeline
                    );
                    let newTimeline = null;
                    try {
                      const compareTimelinesStatus = new CompareTimelinesStatus({
                        status,
                        timelineType,
                        title,
                        timelineInput: {
                          id: savedObjectId,
                          version,
                        },
                        templateTimelineInput: {
                          id: templateTimelineId,
                          version: templateTimelineVersion,
                        },
                        frameworkRequest,
                      });
                      await compareTimelinesStatus.init();
                      const isTemplateTimeline = compareTimelinesStatus.isHandlingTemplateTimeline;
                      if (compareTimelinesStatus.isCreatableViaImport) {
                        // create timeline / template timeline
                        newTimeline = await createTimelines({
                          frameworkRequest,
                          timeline: {
                            ...parsedTimelineObject,
                            status:
                              status === TimelineStatus.draft
                                ? TimelineStatus.active
                                : status ?? TimelineStatus.active,
                            templateTimelineVersion: isTemplateTimeline
                              ? templateTimelineVersion
                              : null,
                            templateTimelineId: isTemplateTimeline
                              ? templateTimelineId ?? uuid.v4()
                              : null,
                          },
                          pinnedEventIds: isTemplateTimeline ? null : pinnedEventIds,
                          notes: isTemplateTimeline ? globalNotes : [...globalNotes, ...eventNotes],
                        });

                        resolve({
                          timeline_id: newTimeline.timeline.savedObjectId,
                          status_code: 200,
                        });
                      }

                      if (!compareTimelinesStatus.isHandlingTemplateTimeline) {
                        const errorMessage = compareTimelinesStatus.checkIsFailureCases(
                          TimelineStatusActions.createViaImport
                        );
                        const message = errorMessage?.body ?? DEFAULT_IMPORT_ERROR;

                        resolve(
                          createBulkErrorObject({
                            id: savedObjectId ?? 'unknown',
                            statusCode: 409,
                            message,
                          })
                        );
                      } else {
                        if (compareTimelinesStatus.isUpdatableViaImport) {
                          // update template timeline
                          newTimeline = await createTimelines({
                            frameworkRequest,
                            timeline: parsedTimelineObject,
                            timelineSavedObjectId: compareTimelinesStatus.timelineId,
                            timelineVersion: compareTimelinesStatus.timelineVersion,
                            notes: globalNotes,
                            existingNoteIds: compareTimelinesStatus.timelineInput.data?.noteIds,
                          });

                          resolve({
                            timeline_id: newTimeline.timeline.savedObjectId,
                            status_code: 200,
                          });
                        } else {
                          const errorMessage = compareTimelinesStatus.checkIsFailureCases(
                            TimelineStatusActions.updateViaImport
                          );

                          const message = errorMessage?.body ?? DEFAULT_IMPORT_ERROR;

                          resolve(
                            createBulkErrorObject({
                              id: savedObjectId ?? 'unknown',
                              statusCode: 409,
                              message,
                            })
                          );
                        }
                      }
                    } catch (err) {
                      resolve(
                        createBulkErrorObject({
                          id: savedObjectId ?? 'unknown',
                          statusCode: 400,
                          message: err.message,
                        })
                      );
                    }
                  }
                );
                return [...accum, importsWorkerPromise];
              },
              []
            )
          );
          importTimelineResponse = [
            ...duplicateIdErrors,
            ...importTimelineResponse,
            ...newImportTimelineResponse,
          ];
        }

        const errorsResp = importTimelineResponse.filter((resp) => {
          return isBulkError(resp);
        }) as BulkError[];
        const successes = importTimelineResponse.filter((resp) => {
          if (isImportRegular(resp)) {
            return resp.status_code === 200;
          } else {
            return false;
          }
        });
        const importTimelines: ImportTimelinesSchema = {
          success: errorsResp.length === 0,
          success_count: successes.length,
          errors: errorsResp,
        };
        const [validated, errors] = validate(importTimelines, importRulesSchema);

        if (errors != null) {
          return siemResponse.error({ statusCode: 500, body: errors });
        } else {
          return response.ok({ body: validated ?? {} });
        }
      } catch (err) {
        const error = transformError(err);
        const siemResponse = buildSiemResponse(response);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
