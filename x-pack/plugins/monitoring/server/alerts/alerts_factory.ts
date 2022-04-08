/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LargeShardSizeRule,
  CCRReadExceptionsRule,
  CpuUsageRule,
  MissingMonitoringDataRule,
  DiskUsageRule,
  ThreadPoolSearchRejectionsRule,
  ThreadPoolWriteRejectionsRule,
  MemoryUsageRule,
  NodesChangedRule,
  ClusterHealthRule,
  LicenseExpirationRule,
  LogstashVersionMismatchRule,
  KibanaVersionMismatchRule,
  ElasticsearchVersionMismatchRule,
  BaseRule,
} from './';
import {
  RULE_CLUSTER_HEALTH,
  RULE_LICENSE_EXPIRATION,
  RULE_CPU_USAGE,
  RULE_MISSING_MONITORING_DATA,
  RULE_DISK_USAGE,
  RULE_THREAD_POOL_SEARCH_REJECTIONS,
  RULE_THREAD_POOL_WRITE_REJECTIONS,
  RULE_MEMORY_USAGE,
  RULE_NODES_CHANGED,
  RULE_LOGSTASH_VERSION_MISMATCH,
  RULE_KIBANA_VERSION_MISMATCH,
  RULE_ELASTICSEARCH_VERSION_MISMATCH,
  RULE_CCR_READ_EXCEPTIONS,
  RULE_LARGE_SHARD_SIZE,
} from '../../common/constants';
import { RulesClient } from '../../../alerting/server';
import { Rule } from '../../../alerting/common';
import { CommonAlertParams } from '../../common/types/alerts';

const BY_TYPE = {
  [RULE_CLUSTER_HEALTH]: ClusterHealthRule,
  [RULE_LICENSE_EXPIRATION]: LicenseExpirationRule,
  [RULE_CPU_USAGE]: CpuUsageRule,
  [RULE_MISSING_MONITORING_DATA]: MissingMonitoringDataRule,
  [RULE_DISK_USAGE]: DiskUsageRule,
  [RULE_THREAD_POOL_SEARCH_REJECTIONS]: ThreadPoolSearchRejectionsRule,
  [RULE_THREAD_POOL_WRITE_REJECTIONS]: ThreadPoolWriteRejectionsRule,
  [RULE_MEMORY_USAGE]: MemoryUsageRule,
  [RULE_NODES_CHANGED]: NodesChangedRule,
  [RULE_LOGSTASH_VERSION_MISMATCH]: LogstashVersionMismatchRule,
  [RULE_KIBANA_VERSION_MISMATCH]: KibanaVersionMismatchRule,
  [RULE_ELASTICSEARCH_VERSION_MISMATCH]: ElasticsearchVersionMismatchRule,
  [RULE_CCR_READ_EXCEPTIONS]: CCRReadExceptionsRule,
  [RULE_LARGE_SHARD_SIZE]: LargeShardSizeRule,
};

export class AlertsFactory {
  public static async getByType(
    type: string,
    alertsClient: RulesClient | undefined
  ): Promise<BaseRule[]> {
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
    return alertClientAlerts.data.map((alert) => new alertCls(alert as Rule) as BaseRule);
  }

  public static getAll() {
    return Object.values(BY_TYPE).map((alert) => new alert());
  }
}
