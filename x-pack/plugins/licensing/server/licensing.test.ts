/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';
import { take, skip } from 'rxjs/operators';
import { merge } from 'lodash';
import { ClusterClient } from 'src/core/server';
import { coreMock } from '../../../../src/core/server/mocks';
import { LicensingPlugin } from './licensing_plugin';
import { LicensingServiceSetup } from './licensing_service_setup';
import { LICENSE_STATUS } from './constants';

interface TestServices {
  plugin: LicensingPlugin;
  service$: BehaviorSubject<LicensingServiceSetup>;
  licensing: LicensingServiceSetup;
  clusterClient: jest.Mocked<PublicMethodsOf<ClusterClient>>;
}

describe('licensing', () => {
  let services: TestServices;

  async function setup(xpackInfo = {}) {
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

    const plugin = new LicensingPlugin(coreMock.createPluginInitializerContext({}));
    const service$ = await plugin.setup(coreSetup);
    const licensing = await service$
      .pipe(
        skip(1),
        take(1)
      )
      .toPromise();

    services = {
      plugin,
      service$,
      licensing,
      clusterClient,
    };

    return services;
  }

  afterEach(async () => {
    await services.plugin.stop();
  });

  test('returns instance of licensing setup', async () => {
    const { licensing } = await setup();

    expect(licensing).toBeInstanceOf(LicensingServiceSetup);
  });

  test('uid returns a UID field', async () => {
    const { licensing } = await setup();

    expect(licensing.uid).toBe('00000000-0000-0000-0000-000000000000');
  });

  test('isActive returns true if status is active', async () => {
    const { licensing } = await setup();

    expect(licensing.isActive).toBe(true);
  });

  test('isActive returns false if status is not active', async () => {
    const { licensing } = await setup({
      license: {
        status: 'aCtIvE', // needs to match exactly
      },
    });

    expect(licensing.isActive).toBe(false);
  });

  test('expiryDateInMillis returns expiry_date_in_millis', async () => {
    const expiry = Date.now();
    const { licensing } = await setup({
      license: {
        expiry_date_in_millis: expiry,
      },
    });

    expect(licensing.expiryDateInMillis).toBe(expiry);
  });

  test('isOneOf returns true if the type includes one of the license types', async () => {
    const { licensing } = await setup({
      license: {
        type: 'platinum',
      },
    });

    expect(licensing.isOneOf('platinum')).toBe(true);
    expect(licensing.isOneOf(['platinum'])).toBe(true);
    expect(licensing.isOneOf(['gold', 'platinum'])).toBe(true);
    expect(licensing.isOneOf(['platinum', 'gold'])).toBe(true);
    expect(licensing.isOneOf(['basic', 'gold'])).toBe(false);
    expect(licensing.isOneOf(['basic'])).toBe(false);
  });

  test('type returns the license type', async () => {
    const { licensing } = await setup();

    expect(licensing.type).toBe('basic');
  });

  describe('isActive', () => {
    test('should return Valid if active and check matches', async () => {
      const { licensing } = await setup({
        license: {
          type: 'gold',
        },
      });

      expect(licensing.check('test', 'basic').check).toBe(LICENSE_STATUS.Valid);
      expect(licensing.check('test', 'gold').check).toBe(LICENSE_STATUS.Valid);
    });

    test('should return Invalid if active and check does not match', async () => {
      const { licensing } = await setup();
      const { check } = licensing.check('test', 'gold');

      expect(check).toBe(LICENSE_STATUS.Invalid);
    });

    test('should return Unavailable if missing license', async () => {
      const { licensing } = await setup({ license: null });
      const { check } = licensing.check('test', 'gold');

      expect(check).toBe(LICENSE_STATUS.Unavailable);
    });

    test('should return Expired if not active', async () => {
      const { licensing } = await setup({
        license: {
          status: 'not-active',
        },
      });
      const { check } = licensing.check('test', 'basic');

      expect(check).toBe(LICENSE_STATUS.Expired);
    });
  });

  describe('basic', () => {
    test('isBasic is true if active and basic', async () => {
      const { licensing } = await setup();

      expect(licensing.isBasic).toBe(true);
    });

    test('isBasic is false if active and not basic', async () => {
      const { licensing } = await setup({
        license: {
          type: 'gold',
        },
      });

      expect(licensing.isBasic).toBe(false);
    });

    test('isBasic is false if not active and basic', async () => {
      const { licensing } = await setup({
        license: {
          status: 'not-active',
        },
      });

      expect(licensing.isBasic).toBe(false);
    });

    test('isNotBasic is false if not active', async () => {
      const { licensing } = await setup({
        license: {
          status: 'not-active',
        },
      });

      expect(licensing.isNotBasic).toBe(false);
    });

    test('isNotBasic is true if active and not basic', async () => {
      const { licensing } = await setup({
        license: {
          type: 'gold',
        },
      });

      expect(licensing.isNotBasic).toBe(true);
    });

    test('isNotBasic is false if active and basic', async () => {
      const { licensing } = await setup();

      expect(licensing.isNotBasic).toBe(false);
    });
  });
});
