/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { validate, MonitoringAlertTypeParams } from '../components/duration/validation';
import { Expression, Props } from '../components/duration/expression';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertTypeModel } from '../../../../triggers_actions_ui/public/types';
import { ALERT_MEMORY_USAGE, ALERT_DETAILS } from '../../../common/constants';

export function createMemoryUsageAlertType(): AlertTypeModel<MonitoringAlertTypeParams> {
  return {
    id: ALERT_MEMORY_USAGE,
    description: ALERT_DETAILS[ALERT_MEMORY_USAGE].description,
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.monitoring.alertsKibanaJvmThreshold}`;
    },
    alertParamsExpression: (props: Props) => (
      <Expression {...props} paramDetails={ALERT_DETAILS[ALERT_MEMORY_USAGE].paramDetails} />
    ),
    validate,
    defaultActionMessage: '{{context.internalFullMessage}}',
    requiresAppContext: true,
  };
}
