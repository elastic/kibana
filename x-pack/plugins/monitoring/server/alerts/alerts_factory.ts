/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CpuUsageAlert,
  NodesChangedAlert,
  ClusterHealthAlert,
  LicenseExpirationAlert,
  LogstashVersionMismatchAlert,
  KibanaVersionMismatchAlert,
  ElasticsearchVersionMismatchAlert,
  BaseAlert,
} from './';
import {
  ALERT_CLUSTER_HEALTH,
  ALERT_LICENSE_EXPIRATION,
  ALERT_CPU_USAGE,
  ALERT_NODES_CHANGED,
  ALERT_LOGSTASH_VERSION_MISMATCH,
  ALERT_KIBANA_VERSION_MISMATCH,
  ALERT_ELASTICSEARCH_VERSION_MISMATCH,
} from '../../common/constants';
import { AlertsClient } from '../../../alerts/server';

export const BY_TYPE = {
  [ALERT_CLUSTER_HEALTH]: ClusterHealthAlert,
  [ALERT_LICENSE_EXPIRATION]: LicenseExpirationAlert,
  [ALERT_CPU_USAGE]: CpuUsageAlert,
  [ALERT_NODES_CHANGED]: NodesChangedAlert,
  [ALERT_LOGSTASH_VERSION_MISMATCH]: LogstashVersionMismatchAlert,
  [ALERT_KIBANA_VERSION_MISMATCH]: KibanaVersionMismatchAlert,
  [ALERT_ELASTICSEARCH_VERSION_MISMATCH]: ElasticsearchVersionMismatchAlert,
};

export class AlertsFactory {
  public static async getByType(
    type: string,
    alertsClient: AlertsClient | undefined
  ): Promise<BaseAlert | null> {
    const alertCls = BY_TYPE[type];
    if (!alertCls) {
      return null;
    }
    if (alertsClient) {
      const alertClientAlerts = await alertsClient.find({
        options: {
          filter: `alert.attributes.alertTypeId:${type}`,
        },
      });

      if (alertClientAlerts.total === 0) {
        return new alertCls();
      }

      const rawAlert = alertClientAlerts.data[0];
      return new alertCls(rawAlert as BaseAlert['rawAlert']);
    }

    return new alertCls();
  }

  public static getAll() {
    return Object.values(BY_TYPE).map((alert) => new alert());
  }
}
