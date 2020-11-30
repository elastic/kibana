/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertTypeModel } from '../../../../triggers_actions_ui/public/types';
import { ALERT_CPU_USAGE, ALERT_DETAILS } from '../../../common/constants';
import { validate } from '../components/duration/validation';
import { Expression, Props } from '../components/duration/expression';

export function createCpuUsageAlertType(): AlertTypeModel {
  return {
    id: ALERT_CPU_USAGE,
    name: ALERT_DETAILS[ALERT_CPU_USAGE].label,
    description: ALERT_DETAILS[ALERT_CPU_USAGE].description,
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/kibana-alerts.html#kibana-alerts-cpu-threshold`;
    },
    alertParamsExpression: (props: Props) => (
      <Expression {...props} paramDetails={ALERT_DETAILS[ALERT_CPU_USAGE].paramDetails} />
    ),
    validate,
    defaultActionMessage: '{{context.internalFullMessage}}',
    requiresAppContext: true,
  };
}
