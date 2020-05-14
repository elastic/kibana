/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CpuUsageAlert, ClusterStateAlert, LicenseExpirationAlert, BaseAlert } from './';
import {
  ALERT_CLUSTER_STATE,
  ALERT_LICENSE_EXPIRATION,
  ALERT_CPU_USAGE,
} from '../../common/constants';
import { AlertsClient } from '../../../alerting/server';

const BY_TYPE = {
  [ALERT_CLUSTER_STATE]: ClusterStateAlert,
  // [ALERT_LICENSE_EXPIRATION]: LicenseExpirationAlert,
  // [ALERT_CPU_USAGE]: CpuUsageAlert,
};

export class AlertsFactory {
  public static async getByType(
    type: string,
    alertsClient: AlertsClient | undefined
  ): Promise<BaseAlert> {
    const alertCls = (BY_TYPE[type] as unknown) as any;
    if (alertsClient) {
      const alertClientAlerts = await alertsClient.find({
        options: {
          filter: `alert.attributes.alertTypeId:${type}`,
        },
      });

      if (alertClientAlerts.total === 0) {
        return new alertCls() as BaseAlert;
      }

      const rawAlert = alertClientAlerts.data[0];
      return new alertCls(rawAlert) as BaseAlert;
    }

    return new alertCls() as BaseAlert;
  }

  public static getAll() {
    return Object.values(BY_TYPE).map(alert => new alert());
  }
}
