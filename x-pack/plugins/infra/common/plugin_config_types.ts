/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface InfraConfig {
  alerting: {
    inventory_threshold: {
      group_by_page_size: number;
    };
    metric_threshold: {
      group_by_page_size: number;
    };
  };
  enabled: boolean;
  inventory: {
    compositeSize: number;
  };
  sources?: {
    default?: {
      fields?: {
        message?: string[];
      };
    };
  };
  featureFlags: {
    customThresholdAlertsEnabled: boolean;
    logsUIEnabled: boolean;
    metricsExplorerEnabled: boolean;
    osqueryEnabled: boolean;
    inventoryThresholdAlertRuleEnabled: boolean;
    metricThresholdAlertRuleEnabled: boolean;
    logThresholdAlertRuleEnabled: boolean;
    alertsAndRulesDropdownEnabled: boolean;
  };
}

export const publicConfigKeys = {
  sources: true,
  featureFlags: true,
} as const;

export type InfraPublicConfigKey = keyof {
  [K in keyof typeof publicConfigKeys as typeof publicConfigKeys[K] extends true ? K : never]: true;
};

export type InfraPublicConfig = Pick<InfraConfig, InfraPublicConfigKey>;
