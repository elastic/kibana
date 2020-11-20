/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertMessage, AlertState, CommonAlertState } from '../../../common/types/alerts';
import {
  ALERT_CPU_USAGE,
  ALERT_LOGSTASH_VERSION_MISMATCH,
  ALERT_THREAD_POOL_WRITE_REJECTIONS,
} from '../../../common/constants';
import { AlertSeverity } from '../../../common/enums';
import { getAlertPanelsByNode } from './get_alert_panels_by_node';
import {
  ALERT_LICENSE_EXPIRATION,
  ALERT_NODES_CHANGED,
  ALERT_DISK_USAGE,
  ALERT_MEMORY_USAGE,
} from '../../../common/constants';

jest.mock('../../legacy_shims', () => ({
  Legacy: {
    shims: {
      uiSettings: {
        get: () => '',
      },
    },
  },
}));

jest.mock('./get_formatted_date_for_alert_state', () => ({
  getFormattedDateForAlertState: (alertState: CommonAlertState) =>
    `triggered:${alertState.state.ui.triggeredMS}`,
}));

describe('getAlertPanelsByNode', () => {
  const ui = {
    isFiring: false,
    severity: AlertSeverity.Danger,
    message: { text: '' },
    resolvedMS: 0,
    lastCheckedMS: 0,
    triggeredMS: 0,
  };

  const cluster = { clusterUuid: '1', clusterName: 'one' };

  function getAlert(type: string, firingCount: number, nonFiringCount: number) {
    const states = [];

    for (let fi = 0; fi < firingCount; fi++) {
      states.push({
        firing: true,
        meta: {},
        state: {
          cluster,
          ui,
          stackProduct: 'elasticsearch',
          stackProductUuid: `es${fi}`,
          stackProductName: `es_name_${fi}`,
        },
      });
    }

    for (let nfi = 0; nfi < firingCount; nfi++) {
      states.push({
        firing: false,
        meta: {},
        state: {
          cluster,
          ui,
          stackProduct: 'elasticsearch',
          stackProductUuid: `es${nfi}`,
          stackProductName: `es_name_${nfi}`,
        },
      });
    }

    return {
      exists: true,
      enabled: true,
      alert: {
        type,
        label: `${type}_label`,
        paramDetails: {},
        rawAlert: {} as any,
        isLegacy: false,
      },
      states,
    };
  }

  const panelTitle = 'Alerts';
  const stateFilter = (state: AlertState) => true;
  const nextStepsFilter = (nextStep: AlertMessage) => true;

  it('should properly group for alerts in each category', () => {
    const alerts = [
      getAlert(ALERT_NODES_CHANGED, 2, 0),
      getAlert(ALERT_DISK_USAGE, 1, 0),
      getAlert(ALERT_LICENSE_EXPIRATION, 2, 2),
    ];
    const result = getAlertPanelsByNode(panelTitle, alerts, stateFilter, nextStepsFilter);
    expect(result).toMatchSnapshot();
  });

  it('should properly group for alerts in a single category', () => {
    const alerts = [getAlert(ALERT_MEMORY_USAGE, 2, 0)];
    const result = getAlertPanelsByNode(panelTitle, alerts, stateFilter, nextStepsFilter);
    expect(result).toMatchSnapshot();
  });

  it('should not show any alert if none are firing', () => {
    const alerts = [
      getAlert(ALERT_LOGSTASH_VERSION_MISMATCH, 0, 2),
      getAlert(ALERT_CPU_USAGE, 0, 1),
      getAlert(ALERT_THREAD_POOL_WRITE_REJECTIONS, 0, 0),
    ];
    const result = getAlertPanelsByNode(panelTitle, alerts, stateFilter, nextStepsFilter);
    expect(result).toMatchSnapshot();
  });
});
