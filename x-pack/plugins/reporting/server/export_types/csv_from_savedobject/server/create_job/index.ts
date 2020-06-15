/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { notFound, notImplemented } from 'boom';
import { get } from 'lodash';
import { KibanaRequest, RequestHandlerContext } from 'src/core/server';
import { CSV_FROM_SAVEDOBJECT_JOB_TYPE } from '../../../../../common/constants';
import { cryptoFactory } from '../../../../lib';
import { ScheduleTaskFnFactory, TimeRangeParams } from '../../../../types';
import {
  JobParamsPanelCsv,
  SavedObject,
  SavedObjectServiceError,
  SavedSearchObjectAttributesJSON,
  SearchPanel,
  VisObjectAttributesJSON,
} from '../../types';
import { createJobSearch } from './create_job_search';

export type ImmediateCreateJobFn<JobParamsType> = (
  jobParams: JobParamsType,
  headers: KibanaRequest['headers'],
  context: RequestHandlerContext,
  req: KibanaRequest
) => Promise<{
  type: string | null;
  title: string;
  jobParams: JobParamsType;
}>;

interface VisData {
  title: string;
  visType: string;
  panel: SearchPanel;
}

export const scheduleTaskFnFactory: ScheduleTaskFnFactory<ImmediateCreateJobFn<
  JobParamsPanelCsv
>> = function createJobFactoryFn(reporting, parentLogger) {
  const config = reporting.getConfig();
  const crypto = cryptoFactory(config.get('encryptionKey'));
  const logger = parentLogger.clone([CSV_FROM_SAVEDOBJECT_JOB_TYPE, 'create-job']);

  return async function scheduleTask(jobParams, headers, context, req) {
    const { savedObjectType, savedObjectId } = jobParams;
    const serializedEncryptedHeaders = await crypto.encrypt(headers);

    const { panel, title, visType }: VisData = await Promise.resolve()
      .then(() => context.core.savedObjects.client.get(savedObjectType, savedObjectId))
      .then(async (savedObject: SavedObject) => {
        const { attributes, references } = savedObject;
        const {
          kibanaSavedObjectMeta: kibanaSavedObjectMetaJSON,
        } = attributes as SavedSearchObjectAttributesJSON;
        const { timerange } = req.body as { timerange: TimeRangeParams };

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
        return await createJobSearch(timerange, attributes, references, kibanaSavedObjectMeta);
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
        if (err.stack) {
          logger.error(err.stack);
        }
        throw new Error(`Unable to create a job from saved object data! Error: ${err}`);
      });

    return {
      headers: serializedEncryptedHeaders,
      jobParams: { ...jobParams, panel, visType },
      type: null,
      title,
    };
  };
};
