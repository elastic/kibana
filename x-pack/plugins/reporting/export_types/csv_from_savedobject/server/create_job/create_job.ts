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
import { JobDocPayload, JobParams, KbnServer } from '../../../../types';
import {
  SavedObject,
  SavedObjectServiceError,
  SavedSearchObjectAttributes,
  SearchPanel,
  TimeRangeParams,
  TsvbPanel,
  VisObjectAttributes,
} from '../../types';
import { generateCsv } from '../lib/generate_csv';
import { createJobSearch } from './create_job_search';
import { createJobVis } from './create_job_vis';

interface VisData {
  title: string;
  visType: string;
  panel: TsvbPanel | SearchPanel;
}

function createJobFn(server: KbnServer) {
  const crypto = cryptoFactory(server);

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
        throw new Error(`Unable to retrieve saved object! Error: ${err}`);
      });

    const { type, rows } = await generateCsv(req, server, visType, panel);
    const csvRows = rows ? rows.join('\n') : rows;

    return {
      jobParams: { ...jobParams, panel, visType },
      title,
      type,
      objects: csvRows,
      headers: serializedEncryptedHeaders,
      basePath: req.getBasePath(),
    };
  };
}

export const createJobFactory = oncePerServer(createJobFn);
