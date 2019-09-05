/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { take, skip } from 'rxjs/operators';
import { ILicense } from '../common/types';
import { License } from '../common/license';
import { licenseMerge } from '../common/license_merge';
import { Plugin } from './plugin';
import { setup, setupOnly } from './__fixtures__/setup';

describe('licensing plugin', () => {
  let plugin: Plugin;
  let license: ILicense;

  afterEach(async () => {
    await plugin.stop();
    sessionStorage.clear();
  });

  test('returns instance of licensing setup', async () => {
    ({ plugin, license } = await setup());
    expect(license).toBeInstanceOf(License);
  });

  test('still returns instance of licensing setup when request fails', async () => {
    const { coreSetup, plugin: _plugin } = await setupOnly();

    plugin = _plugin;
    coreSetup.http.get.mockRejectedValue(new Error('test'));

    const { license$ } = await plugin.setup(coreSetup);
    const finalLicense = await license$
      .pipe(
        skip(1),
        take(1)
      )
      .toPromise();

    expect(finalLicense).toBeInstanceOf(License);
  });

  test('observable receives updated licenses', async () => {
    const { coreSetup, plugin: _plugin } = await setupOnly();
    const types = ['basic', 'gold', 'platinum'];
    let iterations = 0;

    plugin = _plugin;
    plugin.pollingFrequency = 100;
    coreSetup.http.get.mockImplementation(() => {
      return Promise.resolve(
        licenseMerge({
          license: {
            type: types[iterations++],
          },
        })
      );
    });

    const { license$ } = await plugin.setup(coreSetup);
    const licenseTypes: any[] = [];

    await new Promise(resolve => {
      const subscription = license$.subscribe(next => {
        if (!next.type) {
          return;
        }

        if (iterations > 3) {
          subscription.unsubscribe();
          resolve();
        } else {
          licenseTypes.push(next.type);
        }
      });
    });

    expect(licenseTypes).toEqual(['basic', 'gold', 'platinum']);
  });
});
