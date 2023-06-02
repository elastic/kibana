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

const DEFAULT_VALIDATE = () => ({ errors: {} });

export function createLegacyAlertTypes(config: MonitoringConfig): RuleTypeModel[] {
  return LEGACY_RULES.map((legacyAlert) => {
    const validate = LEGACY_RULE_DETAILS[legacyAlert].validate ?? DEFAULT_VALIDATE;
    return {
      id: legacyAlert,
      description: LEGACY_RULE_DETAILS[legacyAlert].description,
      iconClass: 'bell',
      documentationUrl(docLinks) {
        return `${docLinks.links.monitoring.alertsKibanaClusterAlerts}`;
      },
      ruleParamsExpression: (props: LazyExpressionProps) => (
        <LazyExpression
          {...props}
          defaults={LEGACY_RULE_DETAILS[legacyAlert].defaults}
          expressionConfig={LEGACY_RULE_DETAILS[legacyAlert].expressionConfig}
          config={config}
        />
      ),
      defaultActionMessage: '{{context.internalFullMessage}}',
      validate,
      requiresAppContext: RULE_REQUIRES_APP_CONTEXT,
    };
  });
}
