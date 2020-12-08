/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertMessage, AlertState, CommonAlertState } from '../../../common/types/alerts';
import {
  ALERTS,
  ALERT_CPU_USAGE,
  ALERT_LOGSTASH_VERSION_MISMATCH,
  ALERT_THREAD_POOL_WRITE_REJECTIONS,
} from '../../../common/constants';
import { AlertSeverity } from '../../../common/enums';
import { getAlertPanelsByCategory } from './get_alert_panels_by_category';
import {
  ALERT_LICENSE_EXPIRATION,
  ALERT_NODES_CHANGED,
  ALERT_DISK_USAGE,
  ALERT_MEMORY_USAGE,
} from '../../../common/constants';
import { AlertsByName } from '../types';
import { AlertExecutionStatusValues } from '../../../../alerts/common';

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

function getAllAlerts() {
  return ALERTS.reduce((accum: AlertsByName, alertType) => {
    accum[alertType] = {
      states: [],
      rawAlert: {
        alertTypeId: alertType,
        name: `${alertType}_label`,
        id: '',
        enabled: true,
        tags: [],
        consumer: '',
        schedule: { interval: '1m' },
        actions: [],
        params: {},
        createdBy: null,
        updatedBy: null,
        createdAt: new Date('2020-12-08'),
        updatedAt: new Date('2020-12-08'),
        apiKey: null,
        apiKeyOwner: null,
        throttle: null,
        muteAll: false,
        mutedInstanceIds: [],
        executionStatus: {
          status: AlertExecutionStatusValues[0],
          lastExecutionDate: new Date('2020-12-08'),
        },
      },
    };
    return accum;
  }, {});
}

describe('getAlertPanelsByCategory', () => {
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
          ui: {
            ...ui,
            triggeredMS: fi,
          },
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
          ui: {
            ...ui,
            triggeredMS: nfi,
          },
          stackProduct: 'elasticsearch',
          stackProductUuid: `es${nfi}`,
          stackProductName: `es_name_${nfi}`,
        },
      });
    }

    return {
      states,
      rawAlert: {
        alertTypeId: type,
        name: `${type}_label`,
        id: '',
        enabled: true,
        tags: [],
        consumer: '',
        schedule: { interval: '1m' },
        actions: [],
        params: {},
        createdBy: null,
        updatedBy: null,
        createdAt: new Date('2020-12-08'),
        updatedAt: new Date('2020-12-08'),
        apiKey: null,
        apiKeyOwner: null,
        throttle: null,
        muteAll: false,
        mutedInstanceIds: [],
        executionStatus: {
          status: AlertExecutionStatusValues[0],
          lastExecutionDate: new Date('2020-12-08'),
        },
      },
    };
  }

  const alertsContext = {
    allAlerts: getAllAlerts(),
  };

  const panelTitle = 'Alerts';
  const stateFilter = (state: AlertState) => true;
  const nextStepsFilter = (nextStep: AlertMessage) => true;

  describe('non setup mode', () => {
    it('should properly group for alerts in each category', () => {
      const alerts = [
        getAlert(ALERT_NODES_CHANGED, 2, 0),
        getAlert(ALERT_DISK_USAGE, 1, 0),
        getAlert(ALERT_LICENSE_EXPIRATION, 2, 2),
      ];
      const result = getAlertPanelsByCategory(
        panelTitle,
        false,
        alerts,
        alertsContext,
        stateFilter,
        nextStepsFilter
      );
      expect(result).toMatchSnapshot();
    });

    it('should properly group for alerts in a single category', () => {
      const alerts = [getAlert(ALERT_MEMORY_USAGE, 2, 0)];
      const result = getAlertPanelsByCategory(
        panelTitle,
        false,
        alerts,
        alertsContext,
        stateFilter,
        nextStepsFilter
      );
      expect(result).toMatchSnapshot();
    });

    it('should not show any alert if none are firing', () => {
      const alerts = [
        getAlert(ALERT_LOGSTASH_VERSION_MISMATCH, 0, 2),
        getAlert(ALERT_CPU_USAGE, 0, 1),
        getAlert(ALERT_THREAD_POOL_WRITE_REJECTIONS, 0, 0),
      ];
      const result = getAlertPanelsByCategory(
        panelTitle,
        false,
        alerts,
        alertsContext,
        stateFilter,
        nextStepsFilter
      );
      expect(result).toMatchSnapshot();
    });
  });

  describe('setup mode', () => {
    it('should properly group for alerts in each category', () => {
      const alerts = [
        getAlert(ALERT_NODES_CHANGED, 2, 0),
        getAlert(ALERT_DISK_USAGE, 1, 0),
        getAlert(ALERT_LICENSE_EXPIRATION, 2, 2),
      ];
      const result = getAlertPanelsByCategory(
        panelTitle,
        true,
        alerts,
        alertsContext,
        stateFilter,
        nextStepsFilter
      );
      expect(result).toMatchSnapshot();
    });

    it('should properly group for alerts in a single category', () => {
      const alerts = [getAlert(ALERT_MEMORY_USAGE, 2, 0)];
      const result = getAlertPanelsByCategory(
        panelTitle,
        true,
        alerts,
        alertsContext,
        stateFilter,
        nextStepsFilter
      );
      expect(result).toMatchSnapshot();
    });

    it('should still show alerts if none are firing', () => {
      const alerts = [
        getAlert(ALERT_LOGSTASH_VERSION_MISMATCH, 0, 2),
        getAlert(ALERT_CPU_USAGE, 0, 1),
        getAlert(ALERT_THREAD_POOL_WRITE_REJECTIONS, 0, 0),
      ];
      const result = getAlertPanelsByCategory(
        panelTitle,
        true,
        alerts,
        alertsContext,
        stateFilter,
        nextStepsFilter
      );
      expect(result).toMatchSnapshot();
    });
  });
});
