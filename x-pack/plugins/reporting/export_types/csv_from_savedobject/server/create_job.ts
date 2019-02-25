/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { notFound } from 'boom';
import { Request } from 'hapi';
import { get } from 'lodash';
// @ts-ignore
import { cryptoFactory, oncePerServer } from '../../../server/lib';
import { JobDocPayload, JobParams, KbnServer } from '../../../types';
import { SavedObject, SavedObjectServiceError, SearchSource, TsvbPanel, VisState } from '../types';
import { generateCsv } from './lib/generate_csv';

interface VisData {
  title: string;
  visType: string;
  panel: TsvbPanel | SearchSource;
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
      .then((savedObject: SavedObject) => {
        const { attributes } = savedObject;
        const { visState: visStateJSON, kibanaSavedObjectMeta } = attributes;

        if (!visStateJSON && !kibanaSavedObjectMeta) {
          throw new Error('Could not parse saved object data!');
        }

        if (visStateJSON) {
          // visualization type
          const { params: vpanel, title: vtitle, type: vtype }: VisState = JSON.parse(visStateJSON); // no var name shadowing
          if (!vpanel) {
            throw new Error('The saved object contained no panel data!');
          }
          return { panel: vpanel, title: vtitle, visType: vtype };
        }

        // kibanaSavedObjectMeta
        const { searchSourceJSON } = kibanaSavedObjectMeta;
        const searchSource: SearchSource = JSON.parse(searchSourceJSON);
        return { panel: searchSource, title: attributes.title, visType: 'search' };
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
