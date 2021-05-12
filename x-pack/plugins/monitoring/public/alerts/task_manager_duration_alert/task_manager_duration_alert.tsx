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
  ALERT_TASK_MANAGER_DURATION,
  ALERT_DETAILS,
  ALERT_REQUIRES_APP_CONTEXT,
} from '../../../common/constants';
import { validate, MonitoringAlertTypeParams } from '../components/param_details_form/validation';
import { Expression, Props } from '../components/param_details_form/expression';

export function createTaskManagerDurationAlertType(): AlertTypeModel<MonitoringAlertTypeParams> {
  return {
    id: ALERT_TASK_MANAGER_DURATION,
    description: ALERT_DETAILS[ALERT_TASK_MANAGER_DURATION].description,
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.monitoring.alertsKibanaCpuThreshold}`;
    },
    alertParamsExpression: (props: Props) => (
      <Expression
        {...props}
        paramDetails={ALERT_DETAILS[ALERT_TASK_MANAGER_DURATION].paramDetails}
      />
    ),
    validate,
    defaultActionMessage: '{{context.internalFullMessage}}',
    requiresAppContext: ALERT_REQUIRES_APP_CONTEXT,
  };
}
