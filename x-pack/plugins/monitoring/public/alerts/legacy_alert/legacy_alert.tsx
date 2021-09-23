/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertTypeModel } from '../../../../triggers_actions_ui/public/types';
import {
  LEGACY_RULES,
  LEGACY_RULE_DETAILS,
  RULE_REQUIRES_APP_CONTEXT,
} from '../../../common/constants';
import { MonitoringConfig } from '../../types';
import { Expression } from './expression';
import { Props } from '../components/param_details_form/expression';

export function createLegacyAlertTypes(config: MonitoringConfig): AlertTypeModel[] {
  return LEGACY_RULES.map((legacyAlert) => {
    return {
      id: legacyAlert,
      description: LEGACY_RULE_DETAILS[legacyAlert].description,
      iconClass: 'bell',
      documentationUrl(docLinks) {
        return `${docLinks.links.monitoring.alertsKibanaClusterAlerts}`;
      },
      alertParamsExpression: (props: Props) => <Expression {...props} config={config} />,
      defaultActionMessage: '{{context.internalFullMessage}}',
      validate: () => ({ errors: {} }),
      requiresAppContext: RULE_REQUIRES_APP_CONTEXT,
    };
  });
}
