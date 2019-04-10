/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { notFound, notImplemented } from 'boom';
import { Request } from 'hapi';
import { get } from 'lodash';
// @ts-ignore
import { createTaggedLogger, cryptoFactory, oncePerServer } from '../../../../server/lib';
import { JobDocPayload, JobParams, KbnServer, Logger } from '../../../../types';
import {
  SavedObject,
  SavedObjectServiceError,
  SavedSearchObjectAttributesJSON,
  SearchPanel,
  TimeRangeParams,
  VisObjectAttributesJSON,
} from '../../';
import { createGenerateCsv } from '../lib/generate_csv';
import { createJobSearch } from './create_job_search';

interface VisData {
  title: string;
  visType: string;
  panel: SearchPanel;
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

    let type: string = '';
    let result: any = null;

    if (isImmediate) {
      try {
        ({ type, result } = await generateCsv(req, server, visType, panel));
      } catch (err) {
        if (err.stack) {
          logger.error(err.stack);
        }
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
