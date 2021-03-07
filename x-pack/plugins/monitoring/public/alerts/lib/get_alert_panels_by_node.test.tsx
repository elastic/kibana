/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { AlertExecutionStatusValues } from '../../../../alerting/common';
import { AlertState } from '../../../common/types/alerts';

jest.mock('../../legacy_shims', () => ({
  Legacy: {
    shims: {
      uiSettings: {
        get: () => '',
      },
    },
  },
}));

jest.mock('../../../common/formatting', () => ({
  getDateFromNow: (timestamp: number) => `triggered:${timestamp}`,
  getCalendar: (timestamp: number) => `triggered:${timestamp}`,
}));

const mockAlert = {
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
  notifyWhen: null,
};

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

  function getAlert(type: string, firingCount: number) {
    const states = [];

    for (let fi = 0; fi < firingCount; fi++) {
      states.push({
        firing: true,
        meta: {},
        state: {
          cluster,
          ui,
          nodeId: `es${fi}`,
          nodeName: `es_name_${fi}`,
        },
      });
    }

    return {
      rawAlert: {
        alertTypeId: type,
        name: `${type}_label`,
        ...mockAlert,
      },
      states,
    };
  }

  const panelTitle = 'Alerts';
  const stateFilter = (state: AlertState) => true;

  it('should properly group for alerts in each category', () => {
    const alerts = [
      getAlert(ALERT_NODES_CHANGED, 2),
      getAlert(ALERT_DISK_USAGE, 1),
      getAlert(ALERT_LICENSE_EXPIRATION, 2),
    ];
    const result = getAlertPanelsByNode(panelTitle, alerts, stateFilter);
    expect(result).toMatchSnapshot();
  });

  it('should properly group for alerts in a single category', () => {
    const alerts = [getAlert(ALERT_MEMORY_USAGE, 2)];
    const result = getAlertPanelsByNode(panelTitle, alerts, stateFilter);
    expect(result).toMatchSnapshot();
  });

  it('should not show any alert if none are firing', () => {
    const alerts = [
      getAlert(ALERT_LOGSTASH_VERSION_MISMATCH, 0),
      getAlert(ALERT_CPU_USAGE, 0),
      getAlert(ALERT_THREAD_POOL_WRITE_REJECTIONS, 0),
    ];
    const result = getAlertPanelsByNode(panelTitle, alerts, stateFilter);
    expect(result).toMatchSnapshot();
  });
});
