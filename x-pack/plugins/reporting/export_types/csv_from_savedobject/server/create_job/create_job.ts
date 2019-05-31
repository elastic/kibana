/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { notFound, notImplemented } from 'boom';
import { Request } from 'hapi';
import { get } from 'lodash';

import { cryptoFactory, LevelLogger, oncePerServer } from '../../../../server/lib';
import { JobDocPayload, JobParams, KbnServer } from '../../../../types';
import {
  SavedObject,
  SavedObjectServiceError,
  SavedSearchObjectAttributesJSON,
  SearchPanel,
  TimeRangeParams,
  VisObjectAttributesJSON,
} from '../../';
import { createJobSearch } from './create_job_search';

interface VisData {
  title: string;
  visType: string;
  panel: SearchPanel;
}

type CreateJobFn = (jobParams: JobParams, headers: any, req: Request) => Promise<JobDocPayload>;

function createJobFn(server: KbnServer): CreateJobFn {
  const crypto = cryptoFactory(server);
  const logger = LevelLogger.createForServer(server, ['reporting', 'savedobject-csv']);

  return async function createJob(
    jobParams: JobParams,
    headers: any,
    req: Request
  ): Promise<JobDocPayload> {
    const { savedObjectType, savedObjectId } = jobParams;
    const serializedEncryptedHeaders = await crypto.encrypt(headers);
    const client = req.getSavedObjectsClient();

    const { panel, title, visType }: VisData = await Promise.resolve()
      .then(() => client.get(savedObjectType, savedObjectId))
      .then(async (savedObject: SavedObject) => {
        const { attributes, references } = savedObject;
        const {
          kibanaSavedObjectMeta: kibanaSavedObjectMetaJSON,
        } = attributes as SavedSearchObjectAttributesJSON;
        const { timerange } = req.payload as { timerange: TimeRangeParams };

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
      basePath: req.getBasePath(),
      headers: serializedEncryptedHeaders,
      jobParams: { ...jobParams, panel, visType },
      type: null, // resolved in executeJob
      objects: null, // resolved in executeJob
      title,
    };
  };
}

export const createJobFactory = oncePerServer(createJobFn);
