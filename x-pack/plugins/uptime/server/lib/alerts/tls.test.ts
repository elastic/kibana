/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';

import { tlsAlertFactory, getCertSummary, DEFAULT_SIZE } from './tls';
import { TLS } from '../../../common/constants/alerts';
import { CertResult, DynamicSettings } from '../../../common/runtime_types';
import { createRuleTypeMocks, bootstrapDependencies } from './test_utils';
import { DEFAULT_FROM, DEFAULT_TO } from '../../rest_api/certs/certs';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../common/constants';

/**
 * This function aims to provide an easy way to give mock props that will
 * reduce boilerplate for tests.
 * @param params the params received at alert creation time
 * @param state the state the alert maintains
 */
const mockOptions = (
  dynamicCertSettings?: {
    certExpirationThreshold: DynamicSettings['certExpirationThreshold'];
    certAgeThreshold: DynamicSettings['certAgeThreshold'];
  },
  state = {}
): any => {
  const { services } = createRuleTypeMocks(dynamicCertSettings);
  const params = {
    timerange: { from: 'now-15m', to: 'now' },
  };

  return {
    params,
    state,
    services,
  };
};

const mockCertResult: CertResult = {
  certs: [
    {
      not_after: '2020-07-16T03:15:39.000Z',
      not_before: '2019-07-24T03:15:39.000Z',
      common_name: 'Common-One',
      monitors: [{ name: 'monitor-one', id: 'monitor1' }],
      sha256: 'abc',
    },
    {
      not_after: '2020-07-18T03:15:39.000Z',
      not_before: '2019-07-20T03:15:39.000Z',
      common_name: 'Common-Two',
      monitors: [{ name: 'monitor-two', id: 'monitor2' }],
      sha256: 'bcd',
    },
    {
      not_after: '2020-07-19T03:15:39.000Z',
      not_before: '2019-07-22T03:15:39.000Z',
      common_name: 'Common-Three',
      monitors: [{ name: 'monitor-three', id: 'monitor3' }],
      sha256: 'cde',
    },
    {
      not_after: '2020-07-25T03:15:39.000Z',
      not_before: '2019-07-25T03:15:39.000Z',
      common_name: 'Common-Four',
      monitors: [{ name: 'monitor-four', id: 'monitor4' }],
      sha256: 'def',
    },
  ],
  total: 4,
};

describe('tls alert', () => {
  let toISOStringSpy: jest.SpyInstance<string, []>;
  const mockDate = 'date';
  beforeAll(() => {
    Date.now = jest.fn().mockReturnValue(new Date('2021-05-13T12:33:37.000Z'));
  });

  describe('alert executor', () => {
    beforeEach(() => {
      toISOStringSpy = jest.spyOn(Date.prototype, 'toISOString');
    });

    it('triggers when aging or expiring alerts are found', async () => {
      toISOStringSpy.mockImplementation(() => mockDate);
      const mockGetter: jest.Mock<CertResult> = jest.fn();

      mockGetter.mockReturnValue(mockCertResult);
      const { server, libs, plugins } = bootstrapDependencies({ getCerts: mockGetter });
      const alert = tlsAlertFactory(server, libs, plugins);
      const options = mockOptions();
      const {
        services: { alertWithLifecycle },
      } = options;
      // @ts-ignore the executor can return `void`, but ours never does
      const state: Record<string, any> = await alert.executor(options);
      expect(mockGetter).toHaveBeenCalledTimes(1);
      expect(alertWithLifecycle).toHaveBeenCalledTimes(1);
      expect(alertWithLifecycle).toBeCalledWith({
        fields: {
          'cert_status.count': 4,
          'cert_status.aging_common_name_and_date': '',
          'cert_status.aging_count': 0,
          'cert_status.expiring_common_name_and_date':
            'Common-One, expired on 2020-07-16T03:15:39.000Z 301 days ago.; Common-Two, expired on 2020-07-18T03:15:39.000Z 299 days ago.; Common-Three, expired on 2020-07-19T03:15:39.000Z 298 days ago.',
          'cert_status.expiring_count': 4,
          'cert_status.has_aging': null,
          'cert_status.has_expired': true,
          reason: `Detected 4 TLS certificates expiring or becoming too old.

Expiring cert count: 4
Expiring Certificates: Common-One, expired on 2020-07-16T03:15:39.000Z 301 days ago.; Common-Two, expired on 2020-07-18T03:15:39.000Z 299 days ago.; Common-Three, expired on 2020-07-19T03:15:39.000Z 298 days ago.

`,
        },
        id: TLS.id,
      });
      expect(mockGetter).toBeCalledWith(
        expect.objectContaining({
          from: DEFAULT_FROM,
          to: DEFAULT_TO,
          index: 0,
          size: DEFAULT_SIZE,
          notValidAfter: `now+${DYNAMIC_SETTINGS_DEFAULTS.certExpirationThreshold}d`,
          notValidBefore: `now-${DYNAMIC_SETTINGS_DEFAULTS.certAgeThreshold}d`,
          sortBy: 'common_name',
          direction: 'desc',
        })
      );
      const [{ value: alertInstanceMock }] = alertWithLifecycle.mock.results;
      expect(alertInstanceMock.replaceState).toHaveBeenCalledTimes(1);
      expect(alertInstanceMock.replaceState).toBeCalledWith({
        agingCommonNameAndDate: '',
        agingCount: 0,
        count: 4,
        currentTriggerStarted: mockDate,
        expiringCommonNameAndDate:
          'Common-One, expired on 2020-07-16T03:15:39.000Z 301 days ago.; Common-Two, expired on 2020-07-18T03:15:39.000Z 299 days ago.; Common-Three, expired on 2020-07-19T03:15:39.000Z 298 days ago.',
        expiringCount: 4,
        firstCheckedAt: mockDate,
        firstTriggeredAt: mockDate,
        hasAging: null,
        hasExpired: true,
        isTriggered: true,
        lastCheckedAt: mockDate,
        lastResolvedAt: undefined,
        lastTriggeredAt: mockDate,
      });
      expect(alertInstanceMock.scheduleActions).toHaveBeenCalledTimes(1);
      expect(alertInstanceMock.scheduleActions).toBeCalledWith(TLS.id);
    });

    it('handles dynamic settings for aging or expiration threshold', async () => {
      toISOStringSpy.mockImplementation(() => mockDate);
      const mockGetter: jest.Mock<CertResult> = jest.fn();

      mockGetter.mockReturnValue(mockCertResult);
      const { server, libs, plugins } = bootstrapDependencies({ getCerts: mockGetter });
      const alert = tlsAlertFactory(server, libs, plugins);
      const certSettings = { certAgeThreshold: 10, certExpirationThreshold: 5 };
      const options = mockOptions(certSettings);
      const {
        services: { alertWithLifecycle },
      } = options;
      // @ts-ignore the executor can return `void`, but ours never does
      const state: Record<string, any> = await alert.executor(options);
      expect(mockGetter).toHaveBeenCalledTimes(1);
      expect(alertWithLifecycle).toHaveBeenCalledTimes(1);
      expect(alertWithLifecycle).toBeCalledWith({
        fields: {
          'cert_status.count': 4,
          'cert_status.aging_common_name_and_date':
            'Common-Two, valid since 2019-07-20T03:15:39.000Z, 663 days ago.; Common-Three, valid since 2019-07-22T03:15:39.000Z, 661 days ago.; Common-One, valid since 2019-07-24T03:15:39.000Z, 659 days ago.',
          'cert_status.aging_count': 4,
          'cert_status.expiring_common_name_and_date':
            'Common-One, expired on 2020-07-16T03:15:39.000Z 301 days ago.; Common-Two, expired on 2020-07-18T03:15:39.000Z 299 days ago.; Common-Three, expired on 2020-07-19T03:15:39.000Z 298 days ago.',
          'cert_status.expiring_count': 4,
          'cert_status.has_aging': true,
          'cert_status.has_expired': true,
          reason: `Detected 4 TLS certificates expiring or becoming too old.

Expiring cert count: 4
Expiring Certificates: Common-One, expired on 2020-07-16T03:15:39.000Z 301 days ago.; Common-Two, expired on 2020-07-18T03:15:39.000Z 299 days ago.; Common-Three, expired on 2020-07-19T03:15:39.000Z 298 days ago.

Aging cert count: 4
Aging Certificates: Common-Two, valid since 2019-07-20T03:15:39.000Z, 663 days ago.; Common-Three, valid since 2019-07-22T03:15:39.000Z, 661 days ago.; Common-One, valid since 2019-07-24T03:15:39.000Z, 659 days ago.
`,
        },
        id: TLS.id,
      });
      expect(mockGetter).toBeCalledWith(
        expect.objectContaining({
          from: DEFAULT_FROM,
          to: DEFAULT_TO,
          index: 0,
          size: DEFAULT_SIZE,
          notValidAfter: `now+${certSettings.certExpirationThreshold}d`,
          notValidBefore: `now-${certSettings.certAgeThreshold}d`,
          sortBy: 'common_name',
          direction: 'desc',
        })
      );
      const [{ value: alertInstanceMock }] = alertWithLifecycle.mock.results;
      expect(alertInstanceMock.replaceState).toHaveBeenCalledTimes(1);
      expect(alertInstanceMock.replaceState).toBeCalledWith({
        agingCommonNameAndDate:
          'Common-Two, valid since 2019-07-20T03:15:39.000Z, 663 days ago.; Common-Three, valid since 2019-07-22T03:15:39.000Z, 661 days ago.; Common-One, valid since 2019-07-24T03:15:39.000Z, 659 days ago.',
        agingCount: 4,
        count: 4,
        currentTriggerStarted: mockDate,
        expiringCommonNameAndDate:
          'Common-One, expired on 2020-07-16T03:15:39.000Z 301 days ago.; Common-Two, expired on 2020-07-18T03:15:39.000Z 299 days ago.; Common-Three, expired on 2020-07-19T03:15:39.000Z 298 days ago.',
        expiringCount: 4,
        firstCheckedAt: mockDate,
        firstTriggeredAt: mockDate,
        hasAging: true,
        hasExpired: true,
        isTriggered: true,
        lastCheckedAt: mockDate,
        lastResolvedAt: undefined,
        lastTriggeredAt: mockDate,
      });
      expect(alertInstanceMock.scheduleActions).toHaveBeenCalledTimes(1);
      expect(alertInstanceMock.scheduleActions).toBeCalledWith(TLS.id);
    });
  });

  describe('getCertSummary', () => {
    let diffSpy: jest.SpyInstance<any, unknown[]>;

    beforeEach(() => {
      diffSpy = jest.spyOn(moment.prototype, 'diff');
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('sorts expiring certs appropriately when creating summary', () => {
      diffSpy.mockReturnValueOnce(900).mockReturnValueOnce(901).mockReturnValueOnce(902);
      const result = getCertSummary(
        mockCertResult.certs,
        new Date('2020-07-20T05:00:00.000Z').valueOf(),
        new Date('2019-03-01T00:00:00.000Z').valueOf()
      );
      expect(result).toMatchInlineSnapshot(`
        Object {
          "agingCommonNameAndDate": "",
          "agingCount": 0,
          "count": 4,
          "expiringCommonNameAndDate": "Common-One, expired on 2020-07-16T03:15:39.000Z 900 days ago.; Common-Two, expired on 2020-07-18T03:15:39.000Z 901 days ago.; Common-Three, expired on 2020-07-19T03:15:39.000Z 902 days ago.",
          "expiringCount": 3,
          "hasAging": null,
          "hasExpired": true,
        }
      `);
    });

    it('sorts aging certs appropriate when creating summary', () => {
      diffSpy.mockReturnValueOnce(702).mockReturnValueOnce(701).mockReturnValueOnce(700);
      const result = getCertSummary(
        mockCertResult.certs,
        new Date('2020-07-01T12:00:00.000Z').valueOf(),
        new Date('2019-09-01T03:00:00.000Z').valueOf()
      );
      expect(result).toMatchInlineSnapshot(`
        Object {
          "agingCommonNameAndDate": "Common-Two, valid since 2019-07-20T03:15:39.000Z, 702 days ago.; Common-Three, valid since 2019-07-22T03:15:39.000Z, 701 days ago.; Common-One, valid since 2019-07-24T03:15:39.000Z, 700 days ago.",
          "agingCount": 4,
          "count": 4,
          "expiringCommonNameAndDate": "",
          "expiringCount": 0,
          "hasAging": true,
          "hasExpired": null,
        }
      `);
    });

    it('handles negative diff values appropriately for aging certs', () => {
      diffSpy.mockReturnValueOnce(700).mockReturnValueOnce(-90).mockReturnValueOnce(-80);
      const result = getCertSummary(
        mockCertResult.certs,
        new Date('2020-07-01T12:00:00.000Z').valueOf(),
        new Date('2019-09-01T03:00:00.000Z').valueOf()
      );
      expect(result).toMatchInlineSnapshot(`
        Object {
          "agingCommonNameAndDate": "Common-Two, valid since 2019-07-20T03:15:39.000Z, 700 days ago.; Common-Three, invalid until 2019-07-22T03:15:39.000Z, 90 days from now.; Common-One, invalid until 2019-07-24T03:15:39.000Z, 80 days from now.",
          "agingCount": 4,
          "count": 4,
          "expiringCommonNameAndDate": "",
          "expiringCount": 0,
          "hasAging": true,
          "hasExpired": null,
        }
      `);
    });

    it('handles negative diff values appropriately for expiring certs', () => {
      diffSpy
        // negative days are in the future, positive days are in the past
        .mockReturnValueOnce(-96)
        .mockReturnValueOnce(-94)
        .mockReturnValueOnce(2);
      const result = getCertSummary(
        mockCertResult.certs,
        new Date('2020-07-20T05:00:00.000Z').valueOf(),
        new Date('2019-03-01T00:00:00.000Z').valueOf()
      );
      expect(result).toMatchInlineSnapshot(`
        Object {
          "agingCommonNameAndDate": "",
          "agingCount": 0,
          "count": 4,
          "expiringCommonNameAndDate": "Common-One, expires on 2020-07-16T03:15:39.000Z in 96 days.; Common-Two, expires on 2020-07-18T03:15:39.000Z in 94 days.; Common-Three, expired on 2020-07-19T03:15:39.000Z 2 days ago.",
          "expiringCount": 3,
          "hasAging": null,
          "hasExpired": true,
        }
      `);
    });
  });
});
