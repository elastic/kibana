/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { take, skip } from 'rxjs/operators';
import { ClusterClient } from 'src/core/server';
import { coreMock } from '../../../../../src/core/server/mocks';
import { licenseMerge } from '../../common/license_merge';
import { Plugin } from '../plugin';
import { schema } from '../schema';

export async function setupOnly(pluginInitializerContext: any = {}) {
  const coreSetup = coreMock.createSetup();
  const clusterClient = ((await coreSetup.elasticsearch.dataClient$
    .pipe(take(1))
    .toPromise()) as unknown) as jest.Mocked<PublicMethodsOf<ClusterClient>>;
  const plugin = new Plugin(
    coreMock.createPluginInitializerContext({
      ...pluginInitializerContext,
      config: schema.validate(pluginInitializerContext.config || {}),
    })
  );

  return { coreSetup, plugin, clusterClient };
}

export async function setup(xpackInfo = {}, pluginInitializerContext: any = {}) {
  const { coreSetup, clusterClient, plugin } = await setupOnly(pluginInitializerContext);

  clusterClient.callAsInternalUser.mockResolvedValueOnce(licenseMerge(xpackInfo));

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
