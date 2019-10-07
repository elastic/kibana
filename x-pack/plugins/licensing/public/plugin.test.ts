/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { bufferCount, take, skip } from 'rxjs/operators';
import { ILicense } from '../common/types';
import { License } from '../common/license';
import { licenseMerge } from '../common/license_merge';
import { Plugin } from './plugin';
import { mockHttpInterception, setup, setupOnly } from './__fixtures__/setup';

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

  test('intercepted HTTP request changes license signature', async () => {
    const { coreSetup, plugin: _plugin } = await setupOnly();

    plugin = _plugin;
    mockHttpInterception(coreSetup);

    const { license$ } = await plugin.setup(coreSetup);

    await license$
      .pipe(
        skip(1),
        take(1)
      )
      .toPromise();
    await coreSetup.http.get('/api/fake');

    expect(plugin.sign()).toBe('fake-signature');
  });

  test('intercepted HTTP request causes a refresh if the signature changes', async () => {
    const { coreSetup, plugin: _plugin } = await setupOnly();

    plugin = _plugin;
    mockHttpInterception(coreSetup);

    const { license$ } = await plugin.setup(coreSetup);

    // TODO: still need to check that a refresh was triggered
    await license$
      .pipe(
        skip(1),
        take(1)
      )
      .toPromise();
    await coreSetup.http.get('/api/fake');

    expect(plugin.sign()).toBe('fake-signature');
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

    plugin = _plugin;
    plugin.pollingFrequency = 100;
    coreSetup.http.get.mockImplementation(() =>
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
});
