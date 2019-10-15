/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { bufferCount, take, skip } from 'rxjs/operators';
import { ILicense } from '../common/types';
import { License } from '../common/license';
import { licenseMerge } from '../common/license_merge';
import { delay } from '../common/delay';
import { Plugin } from './plugin';
import { setup, setupOnly } from './__fixtures__/setup';

describe('licensing plugin', () => {
  let plugin: Plugin;
  let license: ILicense;

  afterEach(async () => {
    await plugin.stop();
  });

  test('returns instance of licensing setup', async () => {
    ({ plugin, license } = await setup());
    expect(license).toBeInstanceOf(License);
  });

  test('still returns instance of licensing setup when request fails', async () => {
    const { clusterClient, coreSetup, plugin: _plugin } = await setupOnly();

    plugin = _plugin;
    clusterClient.callAsInternalUser.mockRejectedValue(new Error('test'));

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
    const { clusterClient, coreSetup, plugin: _plugin } = await setupOnly({
      config: {
        pollingFrequency: 100,
      },
    });
    const types = ['basic', 'gold', 'platinum'];

    plugin = _plugin;
    clusterClient.callAsInternalUser.mockImplementation(() =>
      Promise.resolve(
        licenseMerge({
          license: {
            type: types.shift(),
          },
        })
      )
    );

    const { license$ } = await plugin.setup(coreSetup);
    const [first, second, third] = await license$
      .pipe(
        skip(1),
        bufferCount(3),
        take(1)
      )
      .toPromise();

    expect([first.type, second.type, third.type]).toEqual(['basic', 'gold', 'platinum']);
  });

  test('polling continues even if there are errors', async () => {
    const { clusterClient, coreSetup, plugin: _plugin } = await setupOnly({
      config: {
        pollingFrequency: 200,
      },
    });
    const errors = [new Error('alpha'), new Error('beta'), new Error('gamma')];

    plugin = _plugin;
    // If polling is working through these errors, this mock will continue to be called
    clusterClient.callAsInternalUser.mockImplementation(() => Promise.reject(errors.shift()));

    const { license$ } = await plugin.setup(coreSetup);
    const [first, second, third] = await license$
      .pipe(
        skip(1),
        bufferCount(3),
        take(1)
      )
      .toPromise();

    expect([first.error!.message, second.error!.message, third.error!.message]).toEqual([
      'alpha',
      'beta',
      'gamma',
    ]);
  });

  test('calling refresh triggers fetch', async () => {
    const { plugin: _plugin, license: _license, license$, clusterClient, refresh } = await setup();

    // We create a dummy subscription to ensure that calls to refresh actually
    // get triggered in the observable.
    license$.subscribe(() => {});
    plugin = _plugin;
    license = _license;
    clusterClient.callAsInternalUser.mockClear();
    refresh();
    await delay(200);

    expect(clusterClient.callAsInternalUser).toHaveBeenCalledWith('transport.request', {
      method: 'GET',
      path: '/_xpack',
    });
  });

  test('provides a licensing context to http routes', async () => {
    const { coreSetup, plugin: _plugin } = await setupOnly();

    plugin = _plugin;
    await plugin.setup(coreSetup);

    expect(coreSetup.http.registerRouteHandlerContext.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "licensing",
          [Function],
        ],
      ]
    `);
  });
});
