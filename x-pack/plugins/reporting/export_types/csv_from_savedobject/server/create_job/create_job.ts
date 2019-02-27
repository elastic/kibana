/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { notFound } from 'boom';
import { Request } from 'hapi';
import { get } from 'lodash';
// @ts-ignore
import { cryptoFactory, oncePerServer } from '../../../../server/lib';
// @ts-ignore
import { createTaggedLogger } from '../../../../server/lib/create_tagged_logger';
import { JobDocPayload, JobParams, KbnServer, Logger } from '../../../../types';
import {
  SavedObject,
  SavedObjectServiceError,
  SavedSearchObjectAttributes,
  SearchPanel,
  TimeRangeParams,
  TsvbPanel,
  VisObjectAttributes,
} from '../../types';
import { createGenerateCsv } from '../lib/generate_csv';
import { createJobSearch } from './create_job_search';
import { createJobVis } from './create_job_vis';

interface VisData {
  title: string;
  visType: string;
  panel: TsvbPanel | SearchPanel;
}

function createJobFn(server: KbnServer) {
  const crypto = cryptoFactory(server);
  const logger: Logger = {
    debug: createTaggedLogger(server, ['reporting', 'savedobject-csv', 'debug']),
    warning: createTaggedLogger(server, ['reporting', 'savedobject-csv', 'warning']),
    error: createTaggedLogger(server, ['reporting', 'savedobject-csv', 'error']),
  };
  const generateCsv = createGenerateCsv(logger);

  return async function createJob(
    jobParams: JobParams,
    headers: any,
    req: Request
  ): Promise<JobDocPayload> {
    const { isImmediate, savedObjectType, savedObjectId } = jobParams;
    const serializedEncryptedHeaders = await crypto.encrypt(headers);
    const client = req.getSavedObjectsClient();

    const { panel, title, visType }: VisData = await Promise.resolve()
      .then(() => client.get(savedObjectType, savedObjectId))
      .then(async (savedObject: SavedObject) => {
        const { attributes } = savedObject;
        const { visState: visStateJSON } = attributes as VisObjectAttributes;
        const { kibanaSavedObjectMeta } = attributes as SavedSearchObjectAttributes;

        let timerange: TimeRangeParams;
        // @ts-ignore
        timerange = req.payload.timerange;

        if (!visStateJSON && !kibanaSavedObjectMeta) {
          throw new Error('Could not parse saved object data!');
        }

        if (visStateJSON) {
          // visualization type
          return await createJobVis(visStateJSON, timerange);
        }

        // saved search type
        return await createJobSearch(client, timerange, savedObject, kibanaSavedObjectMeta);
      })
      .catch((err: Error) => {
        const errPayload: SavedObjectServiceError = get(err, 'output.payload', { statusCode: 0 });
        if (errPayload.statusCode === 404) {
          throw notFound(errPayload.message);
        }
        throw new Error(`Unable to create a job from saved object data! Error: ${err}`);
      });

    let type: string = '';
    let result: any = null;

    if (isImmediate) {
      try {
        ({ type, result } = await generateCsv(req, server, visType, panel));
      } catch (err) {
        logger.error(`Generate CSV Error! ${err}`);
        throw err;
      }
    }

    return {
      jobParams: { ...jobParams, panel, visType },
      title,
      type,
      objects: result ? result.content : result,
      headers: serializedEncryptedHeaders,
      basePath: req.getBasePath(),
    };
  };
}

export const createJobFactory = oncePerServer(createJobFn);
