/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { validate, MonitoringAlertTypeParams } from '../components/param_details_form/validation';
import { Expression, Props } from '../components/param_details_form/expression';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertTypeModel } from '../../../../triggers_actions_ui/public/types';
import {
  RULE_MEMORY_USAGE,
  RULE_DETAILS,
  RULE_REQUIRES_APP_CONTEXT,
} from '../../../common/constants';
import { MonitoringConfig } from '../../types';

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
    alertParamsExpression: (props: Props) => (
      <Expression
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
