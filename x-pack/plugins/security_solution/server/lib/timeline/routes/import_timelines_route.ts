/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extname } from 'path';
import { chunk, omit } from 'lodash/fp';

import { validate } from '../../../../common/validate';
import { importRulesSchema } from '../../../../common/detection_engine/schemas/response/import_rules_schema';
import { createPromiseFromStreams } from '../../../../../../../src/legacy/utils';
import { IRouter } from '../../../../../../../src/core/server';

import { TIMELINE_IMPORT_URL } from '../../../../common/constants';

import { SetupPlugins } from '../../../plugin';
import { ConfigType } from '../../../config';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';

import {
  buildSiemResponse,
  createBulkErrorObject,
  BulkError,
  transformError,
} from '../../detection_engine/routes/utils';

import { createTimelinesStreamFromNdJson } from '../create_timelines_stream_from_ndjson';

import { ImportTimelinesPayloadSchemaRt } from './schemas/import_timelines_schema';
import { buildFrameworkRequest } from './utils/common';
import {
  getTupleDuplicateErrorsAndUniqueTimeline,
  isBulkError,
  isImportRegular,
  ImportTimelineResponse,
  ImportTimelinesSchema,
  PromiseFromStreams,
  timelineSavedObjectOmittedFields,
} from './utils/import_timelines';
import { createTimelines, getTimeline, getTemplateTimeline } from './utils/create_timelines';
import { TimelineType, TimelineStatus } from '../../../../common/types/timeline';
import { checkIsFailureCases } from './utils/update_timelines';

const CHUNK_PARSED_OBJECT_SIZE = 10;

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
                      savedObjectId = null,
                      pinnedEventIds,
                      globalNotes,
                      eventNotes,
                      templateTimelineId,
                      templateTimelineVersion,
                      timelineType,
                      version = null,
                    } = parsedTimeline;
                    const parsedTimelineObject = omit(
                      timelineSavedObjectOmittedFields,
                      parsedTimeline
                    );

                    let newTimeline = null;
                    try {
                      const templateTimeline =
                        templateTimelineId != null
                          ? await getTemplateTimeline(frameworkRequest, templateTimelineId)
                          : null;

                      const timeline =
                        savedObjectId != null &&
                        (await getTimeline(frameworkRequest, savedObjectId));
                      const isHandlingTemplateTimeline = timelineType === TimelineType.template;

                      if (
                        (timeline == null && !isHandlingTemplateTimeline) ||
                        (timeline == null && templateTimeline == null && isHandlingTemplateTimeline)
                      ) {
                        // create timeline / template timeline
                        newTimeline = await createTimelines(
                          frameworkRequest,
                          {
                            ...parsedTimelineObject,
                            status:
                              parsedTimelineObject.status === TimelineStatus.draft
                                ? TimelineStatus.active
                                : parsedTimelineObject.status,
                          },
                          null, // timelineSavedObjectId
                          null, // timelineVersion
                          pinnedEventIds,
                          isHandlingTemplateTimeline
                            ? globalNotes
                            : [...globalNotes, ...eventNotes],
                          [] // existing note ids
                        );

                        resolve({
                          timeline_id: newTimeline.timeline.savedObjectId,
                          status_code: 200,
                        });
                      } else if (
                        timeline &&
                        timeline != null &&
                        templateTimeline != null &&
                        isHandlingTemplateTimeline
                      ) {
                        // update template timeline
                        const errorObj = checkIsFailureCases(
                          isHandlingTemplateTimeline,
                          version,
                          templateTimelineVersion ?? null,
                          timeline,
                          templateTimeline
                        );
                        if (errorObj != null) {
                          return siemResponse.error(errorObj);
                        }

                        newTimeline = await createTimelines(
                          frameworkRequest,
                          { ...parsedTimelineObject, templateTimelineId, templateTimelineVersion },
                          timeline.savedObjectId, // timelineSavedObjectId
                          timeline.version, // timelineVersion
                          pinnedEventIds,
                          globalNotes,
                          [] // existing note ids
                        );

                        resolve({
                          timeline_id: newTimeline.timeline.savedObjectId,
                          status_code: 200,
                        });
                      } else {
                        resolve(
                          createBulkErrorObject({
                            id: savedObjectId ?? 'unknown',
                            statusCode: 409,
                            message: `timeline_id: "${savedObjectId}" already exists`,
                          })
                        );
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

        const errorsResp = importTimelineResponse.filter((resp) =>
          isBulkError(resp)
        ) as BulkError[];
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
