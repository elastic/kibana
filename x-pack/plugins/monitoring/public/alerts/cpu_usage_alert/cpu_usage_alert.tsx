/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertTypeModel } from '../../../../triggers_actions_ui/public/types';
import { validate } from './validation';
import { ALERT_CPU_USAGE } from '../../../common/constants';
import { Expression } from './expression';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { CpuUsageAlert } from '../../../server/alerts';

export function createCpuUsageAlertType(): AlertTypeModel {
  const alert = new CpuUsageAlert();
  return {
    id: ALERT_CPU_USAGE,
    name: alert.label,
    iconClass: 'bell',
    alertParamsExpression: (props: any) => (
      <Expression {...props} paramDetails={CpuUsageAlert.paramDetails} />
    ),
    validate,
    defaultActionMessage: '{{context.internalFullMessage}}',
    requiresAppContext: false,
  };
}
