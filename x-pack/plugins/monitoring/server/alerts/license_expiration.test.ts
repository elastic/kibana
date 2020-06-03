/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';
import { getLicenseExpiration } from './license_expiration';
import { ALERT_TYPE_LICENSE_EXPIRATION } from '../../common/constants';
import { Logger } from 'src/core/server';
import {
  AlertCommonParams,
  AlertCommonState,
  AlertLicensePerClusterState,
  AlertLicense,
} from './types';
import { executeActions } from '../lib/alerts/license_expiration.lib';
import { PreparedAlert, getPreparedAlert } from '../lib/alerts/get_prepared_alert';
import { alertsMock, AlertServicesMock } from '../../../alerts/server/mocks';

jest.mock('../lib/alerts/license_expiration.lib', () => ({
  executeActions: jest.fn(),
  getUiMessage: jest.fn(),
}));

jest.mock('../lib/alerts/get_prepared_alert', () => ({
  getPreparedAlert: jest.fn(() => {
    return {
      emailAddress: 'foo@foo.com',
    };
  }),
}));

describe('getLicenseExpiration', () => {
  const services: AlertServicesMock = alertsMock.createAlertServices();

  const params: AlertCommonParams = {
    dateFormat: 'YYYY',
    timezone: 'UTC',
  };

  const emailAddress = 'foo@foo.com';
  const clusterUuid = 'kdksdfj434';
  const clusterName = 'monitoring_test';
  const dateFormat = 'YYYY-MM-DD';
  const cluster = { clusterUuid, clusterName };
  const defaultUiState = {
    isFiring: false,
    severity: 0,
    message: null,
    resolvedMS: 0,
    lastCheckedMS: 0,
    triggeredMS: 0,
  };

  async function setupAlert(
    license: AlertLicense | null,
    expiredCheckDateMS: number,
    preparedAlertResponse: PreparedAlert | null | undefined = undefined
  ): Promise<AlertCommonState> {
    const logger: Logger = {
      warn: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      info: jest.fn(),
      get: jest.fn(),
    };
    const getLogger = (): Logger => logger;
    const ccrEnabled = false;
    (getPreparedAlert as jest.Mock).mockImplementation(() => {
      if (preparedAlertResponse !== undefined) {
        return preparedAlertResponse;
      }

      return {
        emailAddress,
        data: [license],
        clusters: [cluster],
        dateFormat,
      };
    });

    const alert = getLicenseExpiration(null as any, null as any, getLogger, ccrEnabled);
    const state: AlertCommonState = {
      [clusterUuid]: {
        expiredCheckDateMS,
        ui: { ...defaultUiState },
      } as AlertLicensePerClusterState,
    };

    return (await alert.executor({ services, params, state } as any)) as AlertCommonState;
  }

  afterEach(() => {
    jest.clearAllMocks();
    (executeActions as jest.Mock).mockClear();
    (getPreparedAlert as jest.Mock).mockClear();
  });

  it('should have the right id and actionGroups', () => {
    const alert = getLicenseExpiration(null as any, null as any, jest.fn(), false);
    expect(alert.id).toBe(ALERT_TYPE_LICENSE_EXPIRATION);
    expect(alert.actionGroups).toEqual([{ id: 'default', name: 'Default' }]);
  });

  it('should return the state if no license is provided', async () => {
    const result = await setupAlert(null, 0, null);
    expect(result[clusterUuid].ui).toEqual(defaultUiState);
  });

  it('should fire actions if going to expire', async () => {
    const expiryDateMS = moment().add(7, 'days').valueOf();
    const license = {
      status: 'active',
      type: 'gold',
      expiryDateMS,
      clusterUuid,
    };
    const result = await setupAlert(license, 0);
    const newState = result[clusterUuid] as AlertLicensePerClusterState;
    expect(newState.expiredCheckDateMS > 0).toBe(true);
    expect(executeActions).toHaveBeenCalledWith(
      services.alertInstanceFactory(ALERT_TYPE_LICENSE_EXPIRATION),
      cluster,
      moment.utc(expiryDateMS),
      dateFormat,
      emailAddress
    );
  });

  it('should fire actions if the user fixed their license', async () => {
    const expiryDateMS = moment().add(365, 'days').valueOf();
    const license = {
      status: 'active',
      type: 'gold',
      expiryDateMS,
      clusterUuid,
    };
    const result = await setupAlert(license, 100);
    const newState = result[clusterUuid] as AlertLicensePerClusterState;
    expect(newState.expiredCheckDateMS).toBe(0);
    expect(executeActions).toHaveBeenCalledWith(
      services.alertInstanceFactory(ALERT_TYPE_LICENSE_EXPIRATION),
      cluster,
      moment.utc(expiryDateMS),
      dateFormat,
      emailAddress,
      true
    );
  });

  it('should not fire actions for trial license that expire in more than 14 days', async () => {
    const expiryDateMS = moment().add(20, 'days').valueOf();
    const license = {
      status: 'active',
      type: 'trial',
      expiryDateMS,
      clusterUuid,
    };
    const result = await setupAlert(license, 0);
    const newState = result[clusterUuid] as AlertLicensePerClusterState;
    expect(newState.expiredCheckDateMS).toBe(0);
    expect(executeActions).not.toHaveBeenCalled();
  });

  it('should fire actions for trial license that in 14 days or less', async () => {
    const expiryDateMS = moment().add(7, 'days').valueOf();
    const license = {
      status: 'active',
      type: 'trial',
      expiryDateMS,
      clusterUuid,
    };
    const result = await setupAlert(license, 0);
    const newState = result[clusterUuid] as AlertLicensePerClusterState;
    expect(newState.expiredCheckDateMS > 0).toBe(true);
    expect(executeActions).toHaveBeenCalledWith(
      services.alertInstanceFactory(ALERT_TYPE_LICENSE_EXPIRATION),
      cluster,
      moment.utc(expiryDateMS),
      dateFormat,
      emailAddress
    );
  });
});
