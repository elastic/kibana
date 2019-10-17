/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { take, skip } from 'rxjs/operators';
import { CoreSetup } from '../../../../../src/core/public';
import { coreMock } from '../../../../../src/core/public/mocks';
import { licenseMerge } from '../../common/license_merge';
import { Plugin } from '../plugin';

export function setupOnly() {
  const coreSetup = coreMock.createSetup();
  const plugin = new Plugin(coreMock.createPluginInitializerContext());

  return { coreSetup, plugin };
}

export async function setup(xpackInfo = {}, shouldSkip = true) {
  const { coreSetup, plugin } = setupOnly();

  coreSetup.http.get.mockResolvedValue(licenseMerge(xpackInfo));

  const licensingSetup = await plugin.setup(coreSetup);
  const license = await (shouldSkip
    ? licensingSetup.license$
        .pipe(
          skip(1),
          take(1)
        )
        .toPromise()
    : licensingSetup.license$.pipe(take(1)).toPromise());

  return Object.assign(licensingSetup, {
    coreSetup,
    plugin,
    license,
  });
}

// NOTE: Since we don't have a real interceptor here due to mocks,
// we fake the process and necessary objects.
export function mockHttpInterception(
  coreSetup: MockedKeys<CoreSetup>,
  next?: (path: string, headers: Map<string, string>) => void
): Promise<jest.Mock<any, any>> {
  return new Promise(resolve => {
    coreSetup.http.intercept.mockImplementation(interceptor => {
      coreSetup.http.get.mockImplementation(path => {
        const headers = new Map<string, string>();

        if (next) {
          next(path, headers);
        }

        (interceptor.response as (_: any) => void)({
          request: { url: path },
          response: { headers },
        });

        return licenseMerge({});
      });

      const spy = jest.fn();

      resolve(spy);

      return spy;
    });
  });
}
