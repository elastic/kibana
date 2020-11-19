/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { notFound, notImplemented } from '@hapi/boom';
import { get } from 'lodash';
import { RequestHandlerContext } from 'src/core/server';
import { CSV_FROM_SAVEDOBJECT_JOB_TYPE } from '../../../common/constants';
import { CsvFromSavedObjectRequest } from '../../routes/generate_from_savedobject_immediate';
import { CreateJobFnFactory } from '../../types';
import {
  JobParamsPanelCsv,
  JobPayloadPanelCsv,
  SavedObject,
  SavedObjectReference,
  SavedObjectServiceError,
  VisObjectAttributesJSON,
} from './types';

export type ImmediateCreateJobFn = (
  jobParams: JobParamsPanelCsv,
  context: RequestHandlerContext,
  req: CsvFromSavedObjectRequest
) => Promise<JobPayloadPanelCsv>;

export const createJobFnFactory: CreateJobFnFactory<ImmediateCreateJobFn> = function createJobFactoryFn(
  reporting,
  parentLogger
) {
  const logger = parentLogger.clone([CSV_FROM_SAVEDOBJECT_JOB_TYPE, 'create-job']);

  return async function createJob(jobParams, context, req) {
    const { savedObjectType, savedObjectId } = jobParams;

    const panel = await Promise.resolve()
      .then(() => context.core.savedObjects.client.get(savedObjectType, savedObjectId))
      .then(async (savedObject: SavedObject) => {
        const { attributes, references } = savedObject;
        const { kibanaSavedObjectMeta: kibanaSavedObjectMetaJSON } = attributes;
        const { timerange } = req.body;

        if (!kibanaSavedObjectMetaJSON) {
          throw new Error('Could not parse saved object data!');
        }

        const kibanaSavedObjectMeta = {
          ...kibanaSavedObjectMetaJSON,
          searchSource: JSON.parse(kibanaSavedObjectMetaJSON.searchSourceJSON),
        };

        const { visState: visStateJSON } = attributes as VisObjectAttributesJSON;
        if (visStateJSON) {
          throw notImplemented('Visualization types are not yet implemented');
        }

        // saved search type
        const { searchSource } = kibanaSavedObjectMeta;
        if (!searchSource || !references) {
          throw new Error('The saved search object is missing configuration fields!');
        }

        const indexPatternMeta = references.find(
          (ref: SavedObjectReference) => ref.type === 'index-pattern'
        );
        if (!indexPatternMeta) {
          throw new Error('Could not find index pattern for the saved search!');
        }

        return {
          attributes: {
            ...attributes,
            kibanaSavedObjectMeta: { searchSource },
          },
          indexPatternSavedObjectId: indexPatternMeta.id,
          timerange,
        };
      })
      .catch((err: Error) => {
        const boomErr = (err as unknown) as { isBoom: boolean };
        if (boomErr.isBoom) {
          throw err;
        }
        const errPayload: SavedObjectServiceError = get(err, 'output.payload', { statusCode: 0 });
        if (errPayload.statusCode === 404) {
          throw notFound(errPayload.message);
        }
        logger.error(err);
        throw new Error(`Unable to create a job from saved object data! Error: ${err}`);
      });

    return { ...jobParams, panel };
  };
};
