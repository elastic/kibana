/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { bufferCount, first, take, skip } from 'rxjs/operators';
import { ILicense } from '../common/types';
import { License } from '../common/license';
import { licenseMerge } from '../common/license_merge';
import { LICENSING_SESSION, LICENSING_SESSION_SIGNATURE } from '../common/constants';
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

    await license$
      .pipe(
        skip(1),
        take(1)
      )
      .toPromise();

    const refresh = jest.spyOn(plugin, 'refresh');

    await coreSetup.http.get('/api/fake');
    expect(refresh).toHaveBeenCalled();
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
    const [second, third, fourth] = await license$
      .pipe(
        skip(1),
        bufferCount(3),
        take(1)
      )
      .toPromise();

    expect([second.type, third.type, fourth.type]).toEqual(['basic', 'gold', 'platinum']);
  });
});

describe('licensing plugin | session storage', () => {
  test('loads licensing session', async () => {
    sessionStorage.setItem(LICENSING_SESSION, JSON.stringify({ license: { uid: 'alpha' } }));

    const { plugin, license$ } = await setup();
    const initial = await license$.pipe(first()).toPromise();

    expect(initial.uid).toBe('alpha');
    await plugin.stop();
    sessionStorage.clear();
  });

  test('loads signature session', async () => {
    sessionStorage.setItem(LICENSING_SESSION_SIGNATURE, 'fake-signature');

    const { plugin, license$ } = await setup();
    const initial = await license$.pipe(first()).toPromise();

    expect(initial.signature).toBe('fake-signature');
    await plugin.stop();
    sessionStorage.clear();
  });
});
