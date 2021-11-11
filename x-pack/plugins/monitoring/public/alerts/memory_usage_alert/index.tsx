/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AlertTypeModel } from '../../../../triggers_actions_ui/public';
import {
  RULE_DETAILS,
  RULE_MEMORY_USAGE,
  RULE_REQUIRES_APP_CONTEXT,
} from '../../../common/constants';
import type { MonitoringConfig } from '../../types';
import {
  LazyExpression,
  LazyExpressionProps,
} from '../components/param_details_form/lazy_expression';
import { MonitoringAlertTypeParams, validate } from '../components/param_details_form/validation';

export function createMemoryUsageAlertType(
  config: MonitoringConfig
): AlertTypeModel<MonitoringAlertTypeParams> {
  return {
    id: RULE_MEMORY_USAGE,
    description: RULE_DETAILS[RULE_MEMORY_USAGE].description,
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.monitoring.alertsKibanaJvmThreshold}`;
    },
    alertParamsExpression: (props: LazyExpressionProps) => (
      <LazyExpression
        {...props}
        config={config}
        paramDetails={RULE_DETAILS[RULE_MEMORY_USAGE].paramDetails}
      />
    ),
    validate,
    defaultActionMessage: '{{context.internalFullMessage}}',
    requiresAppContext: RULE_REQUIRES_APP_CONTEXT,
  };
}
