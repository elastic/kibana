/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { take, skip } from 'rxjs/operators';
import { ILicense } from '../common/types';
import { License } from '../common/license';
import {
  API_ROUTE,
  LICENSING_SESSION,
  LICENSING_SESSION_SIGNATURE,
  SIGNATURE_HEADER,
} from '../common/constants';
import { delay } from '../common/delay';
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

  test('intercepted HTTP request causes a refresh if the signature changes', async () => {
    const { coreSetup, plugin: _plugin } = await setupOnly();

    plugin = _plugin;
    mockHttpInterception(coreSetup, (path, headers) => {
      // Here we emulate that the server returned a new signature header,
      // which should trigger the plugin to refresh().
      if (path.includes('/fake')) {
        headers.set(SIGNATURE_HEADER, 'fake-signature');
      }
    });

    const licensingSetup = await plugin.setup(coreSetup);

    await licensingSetup.license$
      .pipe(
        skip(1),
        take(1)
      )
      .toPromise();

    const refresh = jest.spyOn(licensingSetup, 'refresh');

    await coreSetup.http.get('/api/fake');

    expect(refresh).toHaveBeenCalled();
  });

  test('calling refresh triggers fetch', async () => {
    const { coreSetup, plugin: _plugin, license$, refresh } = await setup();

    // We create a dummy subscription to ensure that calls to refresh actually
    // get triggered in the observable.
    license$.subscribe(() => {});
    plugin = _plugin;
    coreSetup.http.get.mockClear();
    refresh();
    await delay(200);

    expect(coreSetup.http.get).toHaveBeenCalledWith(API_ROUTE);
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
});

describe('licensing plugin | stopping', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  test('stopping plugin removes HTTP interceptor', async () => {
    const { coreSetup, plugin } = await setupOnly();
    let removeInterceptor: jest.Mock<any, any>;

    mockHttpInterception(coreSetup).then(spy => {
      removeInterceptor = spy;
    });

    await plugin.setup(coreSetup);
    await plugin.stop();

    expect(removeInterceptor!).toHaveBeenCalled();
  });
});

describe('licensing plugin | session storage', () => {
  let plugin: Plugin;
  let license$: Observable<License>;

  afterEach(async () => {
    sessionStorage.clear();
    await plugin.stop();
  });

  test('loads licensing session', async () => {
    sessionStorage.setItem(
      LICENSING_SESSION,
      JSON.stringify({
        license: {
          uid: 'alpha',
        },
        features: [
          {
            name: 'fake',
            isAvailable: true,
            isEnabled: true,
          },
        ],
      })
    );
    ({ plugin, license$ } = await setup());

    const initial = await license$.pipe(take(1)).toPromise();

    expect(initial.uid).toBe('alpha');
    expect(initial.getFeature('fake').isAvailable).toBe(true);
  });

  test('loads signature session', async () => {
    const FAKE_SIGNATURE = 'fake-signature';

    sessionStorage.setItem(LICENSING_SESSION_SIGNATURE, FAKE_SIGNATURE);

    const { coreSetup, plugin: _plugin } = await setupOnly();

    plugin = _plugin;
    mockHttpInterception(coreSetup, (path, headers) => {
      // Here we set the header signature during interception to be the same value as what
      // we stored in sessionStorage. Below when we make requests to the fake API,
      // if these values match, the plugin's refresh() method should not be called.
      headers.set(SIGNATURE_HEADER, FAKE_SIGNATURE);
    });

    const licensingSetup = await plugin.setup(coreSetup);

    await licensingSetup.license$
      .pipe(
        skip(1),
        take(1)
      )
      .toPromise();

    const refresh = jest.spyOn(licensingSetup, 'refresh');

    await coreSetup.http.get('/api/fake');

    expect(refresh).toHaveBeenCalledTimes(0);
  });

  test('session is cleared when request fails', async () => {
    const { coreSetup, plugin: _plugin } = await setupOnly();

    plugin = _plugin;
    coreSetup.http.get.mockRejectedValue(new Error('test'));
    ({ license$ } = await plugin.setup(coreSetup));

    await license$
      .pipe(
        skip(1),
        take(1)
      )
      .toPromise();

    expect(sessionStorage.removeItem).toHaveBeenCalledWith(LICENSING_SESSION);
    expect(sessionStorage.removeItem).toHaveBeenCalledWith(LICENSING_SESSION_SIGNATURE);
  });
});
