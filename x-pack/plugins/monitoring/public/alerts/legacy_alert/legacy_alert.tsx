/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import {
  LEGACY_RULES,
  LEGACY_RULE_DETAILS,
  RULE_REQUIRES_APP_CONTEXT,
} from '../../../common/constants';
import type { MonitoringConfig } from '../../types';
import { LazyExpression, LazyExpressionProps } from './lazy_expression';

export function createLegacyAlertTypes(config: MonitoringConfig): RuleTypeModel[] {
  return LEGACY_RULES.map((legacyAlert) => {
    return {
      id: legacyAlert,
      description: LEGACY_RULE_DETAILS[legacyAlert].description,
      iconClass: 'bell',
      documentationUrl(docLinks) {
        return `${docLinks.links.monitoring.alertsKibanaClusterAlerts}`;
      },
      ruleParamsExpression: (props: LazyExpressionProps) => (
        <LazyExpression {...props} config={config} />
      ),
      defaultActionMessage: '{{context.internalFullMessage}}',
      validate: () => ({ errors: {} }),
      requiresAppContext: RULE_REQUIRES_APP_CONTEXT,
    };
  });
}
