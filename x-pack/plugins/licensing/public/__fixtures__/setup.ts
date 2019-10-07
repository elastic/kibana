/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { take, skip } from 'rxjs/operators';
import { CoreSetup } from '../../../../../src/core/public';
import { coreMock } from '../../../../../src/core/public/mocks';
import { licenseMerge } from '../../common/license_merge';
import { SIGNATURE_HEADER } from '../../common/constants';
import { Plugin } from '../plugin';

export function setupOnly(pluginInitializerContext: any = {}) {
  const coreSetup = coreMock.createSetup();
  const plugin = new Plugin(coreMock.createPluginInitializerContext(pluginInitializerContext));

  return { coreSetup, plugin };
}

export async function setup(xpackInfo = {}, pluginInitializerContext: any = {}, shouldSkip = true) {
  const { coreSetup, plugin } = setupOnly(pluginInitializerContext);

  coreSetup.http.get.mockResolvedValue(licenseMerge(xpackInfo));

  const { license$ } = await plugin.setup(coreSetup);
  const license = await (shouldSkip
    ? license$
        .pipe(
          skip(1),
          take(1)
        )
        .toPromise()
    : license$.pipe(take(1)).toPromise());

  return {
    coreSetup,
    plugin,
    license$,
    license,
  };
}

// NOTE: Since we don't have a real interceptor here due to mocks,
// we fake the process and necessary objects.
export function mockHttpInterception(coreSetup: MockedKeys<CoreSetup>) {
  coreSetup.http.intercept.mockImplementation(interceptor => {
    coreSetup.http.get.mockImplementation(path => {
      const headers = new Map();

      if (path.includes('fake')) {
        headers.set(SIGNATURE_HEADER, 'fake-signature');
      }

      (interceptor.response as (_: any) => void)({
        request: { url: path },
        response: { headers },
      });

      return licenseMerge({});
    });

    return () => {};
  });
}
