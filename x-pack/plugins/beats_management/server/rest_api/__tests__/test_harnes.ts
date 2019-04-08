/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { badRequest } from 'boom';
import { readFile } from 'fs';
// @ts-ignore
import Hapi from 'hapi';
import { resolve } from 'path';
import { promisify } from 'util';
import { BeatTag, CMBeat } from '../../../common/domain_types';
import { TokenEnrollmentData } from '../../lib/adapters/tokens/adapter_types';
import { compose } from '../../lib/compose/testing';
import { CMServerLibs } from '../../lib/types';
import { initManagementServer } from './../../management_server';

const readFileAsync = promisify(readFile);
let serverLibs: CMServerLibs;

export const testHarnes = {
  description: 'API Development Tests',
  loadData: async () => {
    if (!serverLibs) {
      throw new Error('Server libs not composed yet...');
    }
    const contents = await readFileAsync(resolve(__dirname, './data.json'), 'utf8');
    const database = contents.split(/\n\n/);

    // @ts-ignore the private access
    serverLibs.beats.adapter.setDB(
      database.reduce((inserts: CMBeat[], source) => {
        const type = 'beat';
        const data = JSON.parse(source);

        if (data.value.source.type === type) {
          inserts.push({
            id: data.value.id.substring(data.value.id.indexOf(':') + 1),
            ...data.value.source[type],
          });
        }
        return inserts;
      }, [])
    );

    // @ts-ignore the private access
    serverLibs.tags.adapter.setDB(
      database.reduce((inserts: BeatTag[], source) => {
        const type = 'tag';
        const data = JSON.parse(source);

        if (data.value.source.type === type) {
          inserts.push({
            id: data.value.id.substring(data.value.id.indexOf(':') + 1),
            ...data.value.source[type],
          });
        }
        return inserts;
      }, [])
    );

    // @ts-ignore the private access
    serverLibs.tokens.adapter.setDB(
      database.reduce((inserts: TokenEnrollmentData[], source) => {
        const type = 'token';
        const data = JSON.parse(source);

        if (data.value.source.type === type) {
          inserts.push({
            id: data.value.id.substring(data.value.id.indexOf(':') + 1),
            ...data.value.source[type],
          });
        }
        return inserts;
      }, [])
    );
  },
  getServerLibs: async () => {
    if (!serverLibs) {
      const server = new Hapi.Server({ port: 111111 });
      const versionHeader = 'kbn-version';
      const xsrfHeader = 'kbn-xsrf';

      server.ext('onPostAuth', (req: any, h: any) => {
        const isSafeMethod = req.method === 'get' || req.method === 'head';
        const hasVersionHeader = versionHeader in req.headers;
        const hasXsrfHeader = xsrfHeader in req.headers;

        if (!isSafeMethod && !hasVersionHeader && !hasXsrfHeader) {
          throw badRequest(`Request must contain a ${xsrfHeader} header.`);
        }

        return h.continue;
      });

      serverLibs = compose(server);
      initManagementServer(serverLibs);
    }
    return serverLibs;
  },
};
