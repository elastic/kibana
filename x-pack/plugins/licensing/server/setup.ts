/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { take, skip } from 'rxjs/operators';
import { merge } from 'lodash';
import { ClusterClient } from 'src/core/server';
import { coreMock } from '../../../../src/core/server/mocks';
import { Plugin } from './plugin';

export async function setup(xpackInfo = {}) {
  const coreSetup = coreMock.createSetup();
  const clusterClient = ((await coreSetup.elasticsearch.dataClient$
    .pipe(take(1))
    .toPromise()) as unknown) as jest.Mocked<PublicMethodsOf<ClusterClient>>;

  clusterClient.callAsInternalUser.mockResolvedValueOnce(
    merge(
      {
        license: {
          uid: '00000000-0000-0000-0000-000000000000',
          type: 'basic',
          mode: 'basic',
          status: 'active',
        },
        features: {
          ccr: {
            available: false,
            enabled: true,
          },
          data_frame: {
            available: true,
            enabled: true,
          },
          graph: {
            available: false,
            enabled: true,
          },
          ilm: {
            available: true,
            enabled: true,
          },
          logstash: {
            available: false,
            enabled: true,
          },
          ml: {
            available: false,
            enabled: true,
          },
          monitoring: {
            available: true,
            enabled: true,
          },
          rollup: {
            available: true,
            enabled: true,
          },
          security: {
            available: true,
            enabled: true,
          },
          sql: {
            available: true,
            enabled: true,
          },
          vectors: {
            available: true,
            enabled: true,
          },
          voting_only: {
            available: true,
            enabled: true,
          },
          watcher: {
            available: false,
            enabled: true,
          },
        },
      },
      xpackInfo
    )
  );

  const plugin = new Plugin(coreMock.createPluginInitializerContext({}));
  const { license$ } = await plugin.setup(coreSetup);
  const license = await license$
    .pipe(
      skip(1),
      take(1)
    )
    .toPromise();

  return {
    plugin,
    license$,
    license,
    clusterClient,
  };
}
