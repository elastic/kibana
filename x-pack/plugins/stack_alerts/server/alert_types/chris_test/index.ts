/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AlertingSetup, RuleType } from '../../types';
import { STACK_ALERTS_FEATURE_ID } from '../../../common';
// import { , AlertExecutorOptions } from '../../types';

export function register({ alerting }: { alerting: AlertingSetup }) {
  alerting.registerType(getAlertType());
}

export function getAlertType(): RuleType {
  return {
    id: 'chris_test',
    name: 'Chris Test',
    actionGroups: [{ id: 'chris_test_ag_id', name: 'chris_test_ag_name' }],
    defaultActionGroupId: 'chris_test_ag_id',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: async (options) => {
      await new Promise((resolve) => setTimeout(resolve, 60000));
    },
    producer: STACK_ALERTS_FEATURE_ID,
    // ruleTaskTimeout: '60s',
  };
}
