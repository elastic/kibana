/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LargeShardSizeAlert,
  CCRReadExceptionsAlert,
  CpuUsageAlert,
  MissingMonitoringDataAlert,
  DiskUsageAlert,
  ThreadPoolSearchRejectionsAlert,
  ThreadPoolWriteRejectionsAlert,
  MemoryUsageAlert,
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
  ALERT_MISSING_MONITORING_DATA,
  ALERT_DISK_USAGE,
  ALERT_THREAD_POOL_SEARCH_REJECTIONS,
  ALERT_THREAD_POOL_WRITE_REJECTIONS,
  ALERT_MEMORY_USAGE,
  ALERT_NODES_CHANGED,
  ALERT_LOGSTASH_VERSION_MISMATCH,
  ALERT_KIBANA_VERSION_MISMATCH,
  ALERT_ELASTICSEARCH_VERSION_MISMATCH,
  ALERT_CCR_READ_EXCEPTIONS,
  ALERT_LARGE_SHARD_SIZE,
} from '../../common/constants';
import { RulesClient } from '../../../alerting/server';
import { Alert } from '../../../alerting/common';
import { CommonAlertParams } from '../../common/types/alerts';

const BY_TYPE = {
  [ALERT_CLUSTER_HEALTH]: ClusterHealthAlert,
  [ALERT_LICENSE_EXPIRATION]: LicenseExpirationAlert,
  [ALERT_CPU_USAGE]: CpuUsageAlert,
  [ALERT_MISSING_MONITORING_DATA]: MissingMonitoringDataAlert,
  [ALERT_DISK_USAGE]: DiskUsageAlert,
  [ALERT_THREAD_POOL_SEARCH_REJECTIONS]: ThreadPoolSearchRejectionsAlert,
  [ALERT_THREAD_POOL_WRITE_REJECTIONS]: ThreadPoolWriteRejectionsAlert,
  [ALERT_MEMORY_USAGE]: MemoryUsageAlert,
  [ALERT_NODES_CHANGED]: NodesChangedAlert,
  [ALERT_LOGSTASH_VERSION_MISMATCH]: LogstashVersionMismatchAlert,
  [ALERT_KIBANA_VERSION_MISMATCH]: KibanaVersionMismatchAlert,
  [ALERT_ELASTICSEARCH_VERSION_MISMATCH]: ElasticsearchVersionMismatchAlert,
  [ALERT_CCR_READ_EXCEPTIONS]: CCRReadExceptionsAlert,
  [ALERT_LARGE_SHARD_SIZE]: LargeShardSizeAlert,
};

export class AlertsFactory {
  public static async getByType(
    type: string,
    alertsClient: RulesClient | undefined
  ): Promise<BaseAlert[]> {
    const alertCls = BY_TYPE[type];
    if (!alertCls || !alertsClient) {
      return [];
    }
    const alertClientAlerts = await alertsClient.find<CommonAlertParams>({
      options: {
        filter: `alert.attributes.alertTypeId:${type}`,
      },
    });

    if (!alertClientAlerts.total || !alertClientAlerts.data?.length) {
      return [];
    }
    return alertClientAlerts.data.map((alert) => new alertCls(alert as Alert) as BaseAlert);
  }

  public static getAll() {
    return Object.values(BY_TYPE).map((alert) => new alert());
  }
}
