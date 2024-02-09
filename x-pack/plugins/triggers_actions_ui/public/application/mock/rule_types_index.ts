/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTypeIndex } from '../../types';

export const ruleTypesIndex = new Map([
  [
    '.index-threshold',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'threshold met',
          name: 'Threshold met',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'threshold met',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: true,
      hasAlertsMappings: true,
      hasFieldsForAAD: false,
      id: '.index-threshold',
      name: 'Index threshold',
      category: 'management',
      producer: 'stackAlerts',
      is_exportable: true,
    },
  ],
  [
    '.geo-containment',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'notGeoContained',
        name: 'No longer contained',
      },
      actionGroups: [
        {
          id: 'Tracked entity contained',
          name: 'Tracking containment met',
        },
        {
          id: 'notGeoContained',
          name: 'No longer contained',
        },
      ],
      defaultActionGroupId: 'Tracked entity contained',
      minimumLicenseRequired: 'gold',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: true,
      hasAlertsMappings: true,
      hasFieldsForAAD: false,
      id: '.geo-containment',
      name: 'Tracking containment',
      category: 'management',
      producer: 'stackAlerts',
      is_exportable: true,
    },
  ],
  [
    '.es-query',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'query matched',
          name: 'Query matched',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'query matched',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: true,
      hasAlertsMappings: true,
      hasFieldsForAAD: false,
      id: '.es-query',
      name: 'Elasticsearch query',
      category: 'management',
      producer: 'stackAlerts',
      is_exportable: true,
    },
  ],
  [
    'transform_health',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'transform_issue',
          name: 'Issue detected',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'transform_issue',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: true,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      id: 'transform_health',
      name: 'Transform health',
      category: 'management',
      producer: 'stackAlerts',
      is_exportable: true,
    },
  ],
  [
    'xpack.ml.anomaly_detection_alert',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'anomaly_score_match',
          name: 'Anomaly score matched the condition',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'anomaly_score_match',
      minimumLicenseRequired: 'platinum',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: true,
      hasAlertsMappings: true,
      hasFieldsForAAD: false,
      id: 'xpack.ml.anomaly_detection_alert',
      name: 'Anomaly detection',
      category: 'management',
      producer: 'ml',
      is_exportable: true,
    },
  ],
  [
    'xpack.ml.anomaly_detection_jobs_health',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'anomaly_detection_realtime_issue',
          name: 'Issue detected',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'anomaly_detection_realtime_issue',
      minimumLicenseRequired: 'platinum',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: true,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      id: 'xpack.ml.anomaly_detection_jobs_health',
      name: 'Anomaly detection jobs health',
      category: 'management',
      producer: 'ml',
      is_exportable: true,
    },
  ],
  [
    'slo.rules.burnRate',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'slo.burnRate.alert',
          name: 'Critical',
        },
        {
          id: 'slo.burnRate.high',
          name: 'High',
        },
        {
          id: 'slo.burnRate.medium',
          name: 'Medium',
        },
        {
          id: 'slo.burnRate.low',
          name: 'Low',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'slo.burnRate.alert',
      minimumLicenseRequired: 'platinum',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: true,
      hasAlertsMappings: true,
      hasFieldsForAAD: true,
      id: 'slo.rules.burnRate',
      name: 'SLO burn rate',
      category: 'observability',
      producer: 'slo',
      fieldsForAAD: ['slo.id', 'slo.revision', 'slo.instanceId'],
      is_exportable: true,
    },
  ],
  [
    'xpack.uptime.alerts.tls',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'xpack.uptime.alerts.actionGroups.tls',
          name: 'Uptime TLS Alert (Legacy)',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'xpack.uptime.alerts.actionGroups.tls',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      id: 'xpack.uptime.alerts.tls',
      name: 'Uptime TLS (Legacy)',
      category: 'observability',
      producer: 'uptime',
      is_exportable: true,
    },
  ],
  [
    'xpack.uptime.alerts.tlsCertificate',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'xpack.uptime.alerts.actionGroups.tlsCertificate',
          name: 'Uptime TLS Alert',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'xpack.uptime.alerts.actionGroups.tlsCertificate',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: true,
      hasAlertsMappings: true,
      hasFieldsForAAD: false,
      id: 'xpack.uptime.alerts.tlsCertificate',
      name: 'Uptime TLS',
      category: 'observability',
      producer: 'uptime',
      is_exportable: true,
    },
  ],
  [
    'xpack.uptime.alerts.monitorStatus',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'xpack.uptime.alerts.actionGroups.monitorStatus',
          name: 'Uptime Down Monitor',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'xpack.uptime.alerts.actionGroups.monitorStatus',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: true,
      hasAlertsMappings: true,
      hasFieldsForAAD: false,
      id: 'xpack.uptime.alerts.monitorStatus',
      name: 'Uptime monitor status',
      category: 'observability',
      producer: 'uptime',
      is_exportable: true,
    },
  ],
  [
    'xpack.uptime.alerts.durationAnomaly',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'xpack.uptime.alerts.actionGroups.durationAnomaly',
          name: 'Uptime Duration Anomaly',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'xpack.uptime.alerts.actionGroups.durationAnomaly',
      minimumLicenseRequired: 'platinum',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: true,
      hasAlertsMappings: true,
      hasFieldsForAAD: false,
      id: 'xpack.uptime.alerts.durationAnomaly',
      name: 'Uptime Duration Anomaly',
      category: 'observability',
      producer: 'uptime',
      is_exportable: true,
    },
  ],
  [
    'xpack.synthetics.alerts.monitorStatus',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
          name: 'Synthetics monitor status',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: true,
      hasAlertsMappings: true,
      hasFieldsForAAD: false,
      id: 'xpack.synthetics.alerts.monitorStatus',
      name: 'Synthetics monitor status',
      category: 'observability',
      producer: 'uptime',
      is_exportable: true,
    },
  ],
  [
    'xpack.synthetics.alerts.tls',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'xpack.synthetics.alerts.actionGroups.tls',
          name: 'Synthetics TLS certificate',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'xpack.synthetics.alerts.actionGroups.tls',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: true,
      hasAlertsMappings: true,
      hasFieldsForAAD: false,
      id: 'xpack.synthetics.alerts.tls',
      name: 'Synthetics TLS certificate',
      category: 'observability',
      producer: 'uptime',
      is_exportable: true,
    },
  ],
  [
    'metrics.alert.threshold',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'metrics.threshold.fired',
          name: 'Alert',
        },
        {
          id: 'metrics.threshold.warning',
          name: 'Warning',
        },
        {
          id: 'metrics.threshold.nodata',
          name: 'No Data',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'metrics.threshold.fired',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: true,
      hasAlertsMappings: true,
      hasFieldsForAAD: true,
      id: 'metrics.alert.threshold',
      name: 'Metric threshold',
      category: 'observability',
      producer: 'infrastructure',
      fieldsForAAD: ['cloud.*', 'host.*', 'orchestrator.*', 'container.*', 'labels.*', 'tags'],
      is_exportable: true,
    },
  ],
  [
    'metrics.alert.inventory.threshold',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'metrics.inventory_threshold.fired',
          name: 'Alert',
        },
        {
          id: 'metrics.inventory_threshold.warning',
          name: 'Warning',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'metrics.inventory_threshold.fired',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: true,
      hasAlertsMappings: true,
      hasFieldsForAAD: true,
      id: 'metrics.alert.inventory.threshold',
      name: 'Inventory',
      category: 'observability',
      producer: 'infrastructure',
      fieldsForAAD: ['cloud.*', 'host.*', 'orchestrator.*', 'container.*', 'labels.*', 'tags'],
      is_exportable: true,
    },
  ],
  [
    'observability.rules.custom_threshold',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'custom_threshold.fired',
          name: 'Alert',
        },
        {
          id: 'custom_threshold.nodata',
          name: 'No Data',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'custom_threshold.fired',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: true,
      hasAlertsMappings: true,
      hasFieldsForAAD: true,
      id: 'observability.rules.custom_threshold',
      name: 'Custom threshold (Beta)',
      category: 'observability',
      producer: 'observability',
      fieldsForAAD: ['cloud.*', 'host.*', 'orchestrator.*', 'container.*', 'labels.*', 'tags'],
      is_exportable: true,
    },
  ],
  [
    'logs.alert.document.count',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'logs.threshold.fired',
          name: 'Fired',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'logs.threshold.fired',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: true,
      hasAlertsMappings: true,
      hasFieldsForAAD: true,
      id: 'logs.alert.document.count',
      name: 'Log threshold',
      category: 'observability',
      producer: 'logs',
      fieldsForAAD: ['cloud.*', 'host.*', 'orchestrator.*', 'container.*', 'labels.*', 'tags'],
      is_exportable: true,
    },
  ],
  [
    'monitoring_alert_license_expiration',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      id: 'monitoring_alert_license_expiration',
      name: 'License expiration',
      category: 'management',
      producer: 'monitoring',
      is_exportable: false,
    },
  ],
  [
    'monitoring_alert_cluster_health',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      id: 'monitoring_alert_cluster_health',
      name: 'Cluster health',
      category: 'management',
      producer: 'monitoring',
      is_exportable: false,
    },
  ],
  [
    'monitoring_alert_cpu_usage',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      id: 'monitoring_alert_cpu_usage',
      name: 'CPU Usage',
      category: 'management',
      producer: 'monitoring',
      is_exportable: false,
    },
  ],
  [
    'monitoring_alert_disk_usage',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      id: 'monitoring_alert_disk_usage',
      name: 'Disk Usage',
      category: 'management',
      producer: 'monitoring',
      is_exportable: false,
    },
  ],
  [
    'monitoring_alert_nodes_changed',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      id: 'monitoring_alert_nodes_changed',
      name: 'Nodes changed',
      category: 'management',
      producer: 'monitoring',
      is_exportable: false,
    },
  ],
  [
    'monitoring_alert_elasticsearch_version_mismatch',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      id: 'monitoring_alert_elasticsearch_version_mismatch',
      name: 'Elasticsearch version mismatch',
      category: 'management',
      producer: 'monitoring',
      is_exportable: false,
    },
  ],
  [
    'monitoring_alert_kibana_version_mismatch',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      id: 'monitoring_alert_kibana_version_mismatch',
      name: 'Kibana version mismatch',
      category: 'management',
      producer: 'monitoring',
      is_exportable: false,
    },
  ],
  [
    'monitoring_alert_logstash_version_mismatch',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      id: 'monitoring_alert_logstash_version_mismatch',
      name: 'Logstash version mismatch',
      category: 'management',
      producer: 'monitoring',
      is_exportable: false,
    },
  ],
  [
    'monitoring_alert_jvm_memory_usage',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      id: 'monitoring_alert_jvm_memory_usage',
      name: 'Memory Usage (JVM)',
      category: 'management',
      producer: 'monitoring',
      is_exportable: false,
    },
  ],
  [
    'monitoring_alert_missing_monitoring_data',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      id: 'monitoring_alert_missing_monitoring_data',
      name: 'Missing monitoring data',
      category: 'management',
      producer: 'monitoring',
      is_exportable: false,
    },
  ],
  [
    'monitoring_alert_thread_pool_search_rejections',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      id: 'monitoring_alert_thread_pool_search_rejections',
      name: 'Thread pool search rejections',
      category: 'management',
      producer: 'monitoring',
      is_exportable: false,
    },
  ],
  [
    'monitoring_alert_thread_pool_write_rejections',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      id: 'monitoring_alert_thread_pool_write_rejections',
      name: 'Thread pool write rejections',
      category: 'management',
      producer: 'monitoring',
      is_exportable: false,
    },
  ],
  [
    'monitoring_ccr_read_exceptions',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      id: 'monitoring_ccr_read_exceptions',
      name: 'CCR read exceptions',
      category: 'management',
      producer: 'monitoring',
      is_exportable: false,
    },
  ],
  [
    'monitoring_shard_size',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      id: 'monitoring_shard_size',
      name: 'Shard size',
      category: 'management',
      producer: 'monitoring',
      is_exportable: false,
    },
  ],
  [
    'apm.error_rate',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'threshold_met',
          name: 'Threshold met',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'threshold_met',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: true,
      hasFieldsForAAD: false,
      id: 'apm.error_rate',
      name: 'Error count threshold',
      category: 'observability',
      producer: 'apm',
      is_exportable: true,
    },
  ],
  [
    'apm.transaction_error_rate',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'threshold_met',
          name: 'Threshold met',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'threshold_met',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: true,
      hasFieldsForAAD: false,
      id: 'apm.transaction_error_rate',
      name: 'Failed transaction rate threshold',
      category: 'observability',
      producer: 'apm',
      is_exportable: true,
    },
  ],
  [
    'apm.transaction_duration',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'threshold_met',
          name: 'Threshold met',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'threshold_met',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: true,
      hasFieldsForAAD: false,
      id: 'apm.transaction_duration',
      name: 'Latency threshold',
      category: 'observability',
      producer: 'apm',
      is_exportable: true,
    },
  ],
  [
    'apm.anomaly',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'threshold_met',
          name: 'Threshold met',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'threshold_met',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: true,
      hasFieldsForAAD: false,
      id: 'apm.anomaly',
      name: 'APM Anomaly',
      category: 'observability',
      producer: 'apm',
      is_exportable: true,
    },
  ],
  [
    'siem.notifications',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      id: 'siem.notifications',
      name: 'Security Solution notification (Legacy)',
      category: 'securitySolution',
      producer: 'siem',
      is_exportable: false,
    },
  ],
  [
    'siem.esqlRule',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: true,
      hasFieldsForAAD: false,
      id: 'siem.esqlRule',
      name: 'ES|QL Rule',
      category: 'securitySolution',
      producer: 'siem',
      is_exportable: false,
    },
  ],
  [
    'siem.eqlRule',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: true,
      hasFieldsForAAD: false,
      id: 'siem.eqlRule',
      name: 'Event Correlation Rule',
      category: 'securitySolution',
      producer: 'siem',
      is_exportable: false,
    },
  ],
  [
    'siem.indicatorRule',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '1h',
      doesSetRecoveryContext: false,
      hasAlertsMappings: true,
      hasFieldsForAAD: false,
      id: 'siem.indicatorRule',
      name: 'Indicator Match Rule',
      category: 'securitySolution',
      producer: 'siem',
      is_exportable: false,
    },
  ],
  [
    'siem.mlRule',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: true,
      hasFieldsForAAD: false,
      id: 'siem.mlRule',
      name: 'Machine Learning Rule',
      category: 'securitySolution',
      producer: 'siem',
      is_exportable: false,
    },
  ],
  [
    'siem.queryRule',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: true,
      hasFieldsForAAD: false,
      id: 'siem.queryRule',
      name: 'Custom Query Rule',
      category: 'securitySolution',
      producer: 'siem',
      is_exportable: false,
    },
  ],
  [
    'siem.savedQueryRule',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: true,
      hasFieldsForAAD: false,
      id: 'siem.savedQueryRule',
      name: 'Saved Query Rule',
      category: 'securitySolution',
      producer: 'siem',
      is_exportable: false,
    },
  ],
  [
    'siem.thresholdRule',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: true,
      hasFieldsForAAD: false,
      id: 'siem.thresholdRule',
      name: 'Threshold Rule',
      category: 'securitySolution',
      producer: 'siem',
      is_exportable: false,
    },
  ],
  [
    'siem.newTermsRule',
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        alerts: {
          read: true,
          all: true,
        },
        stackAlerts: {
          read: true,
          all: true,
        },
        ml: {
          read: true,
          all: true,
        },
        slo: {
          read: true,
          all: true,
        },
        uptime: {
          read: true,
          all: true,
        },
        infrastructure: {
          read: true,
          all: true,
        },
        logs: {
          read: true,
          all: true,
        },
        monitoring: {
          read: true,
          all: true,
        },
        apm: {
          read: true,
          all: true,
        },
        siem: {
          read: true,
          all: true,
        },
        discover: {
          read: true,
          all: true,
        },
      },
      ruleTaskTimeout: '5m',
      doesSetRecoveryContext: false,
      hasAlertsMappings: true,
      hasFieldsForAAD: false,
      id: 'siem.newTermsRule',
      name: 'New Terms Rule',
      category: 'securitySolution',
      producer: 'siem',
      is_exportable: false,
    },
  ],
]) as unknown as RuleTypeIndex;
