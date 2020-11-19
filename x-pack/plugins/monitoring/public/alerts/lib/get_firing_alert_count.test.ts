/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertState } from '../../../common/types/alerts';
import { AlertSeverity } from '../../../common/enums';
import { getFiringAlertCount } from './get_firing_alert_count';

const ui = {
  isFiring: false,
  severity: AlertSeverity.Danger,
  message: { text: '' },
  resolvedMS: 0,
  lastCheckedMS: 0,
  triggeredMS: 0,
};

const cluster = { clusterUuid: '1', clusterName: 'one' };

describe('getFiringAlertCount', () => {
  it('should count firing states', () => {
    const alerts = [
      {
        exists: true,
        enabled: true,
        alert: {
          type: '',
          label: '',
          paramDetails: {},
          rawAlert: { isMock: true as const },
          isLegacy: false,
        },
        states: [
          {
            firing: true,
            meta: {},
            state: {
              cluster,
              ui,
              stackProduct: 'elasticsearch',
              stackProductUuid: 'es1',
              stackProductName: 'es_name_1',
            },
          },
          {
            firing: true,
            meta: {},
            state: {
              cluster,
              ui,
              stackProduct: 'elasticsearch',
              stackProductUuid: 'es1',
              stackProductName: 'es_name_1',
            },
          },
          {
            firing: false,
            meta: {},
            state: {
              cluster,
              ui,
              stackProduct: 'elasticsearch',
              stackProductUuid: 'es1',
              stackProductName: 'es_name_1',
            },
          },
        ],
      },
    ];
    const stateFilter = (state: AlertState) => true;
    const count = getFiringAlertCount(alerts, stateFilter);
    expect(count).toBe(2);
  });

  it('should use the filter', () => {
    const alerts = [
      {
        exists: true,
        enabled: true,
        alert: {
          type: '',
          label: '',
          paramDetails: {},
          rawAlert: { isMock: true as const },
          isLegacy: false,
        },
        states: [
          {
            firing: true,
            meta: {},
            state: {
              cluster,
              ui,
              stackProduct: 'elasticsearch',
              stackProductUuid: 'es2',
              stackProductName: 'es_name_2',
            },
          },
          {
            firing: true,
            meta: {},
            state: {
              cluster,
              ui,
              stackProduct: 'elasticsearch',
              stackProductUuid: 'es1',
              stackProductName: 'es_name_1',
            },
          },
          {
            firing: true,
            meta: {},
            state: {
              cluster,
              ui,
              stackProduct: 'elasticsearch',
              stackProductUuid: 'es3',
              stackProductName: 'es_name_3',
            },
          },
        ],
      },
    ];
    const stateFilter = (state: AlertState) => state.stackProductUuid === 'es3';
    const count = getFiringAlertCount(alerts, stateFilter);
    expect(count).toBe(1);
  });
});
