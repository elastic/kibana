/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import React from 'react';
import { useActiveRules } from './use_active_rules';
import {
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
} from '../../../../../../../common/constants/synthetics_alerts';

export function AlertMissingCallout() {
  const { activeRules, activeRuleLoading } = useActiveRules();
  console.log('active rules', activeRules, activeRuleLoading);

  if (!activeRules) {
    return null;
  }
  console.log('active rules', activeRules);
  const hasStatusRule = activeRules.some(
    (rule) => rule.rule_type_id === SYNTHETICS_STATUS_RULE && rule.enabled
  );
  const hasTls = activeRules.some(
    (rule) => rule.rule_type_id === SYNTHETICS_TLS_RULE && rule.enabled
  );
  console.log('has status rule', hasStatusRule);
  console.log('has tls rule', hasTls);
  return (
    <>
      {!hasStatusRule && (
        <EuiCallOut title="Status alert is missing" color="warning" iconType="alert" />
      )}
      {!hasTls && <EuiCallOut title="TLS alert is missing" color="warning" iconType="alert" />}
    </>
  );
}
