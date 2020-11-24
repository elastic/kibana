/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertTypeModel } from '../../../../triggers_actions_ui/public/types';
import { validate } from './validation';
import { ALERT_MISSING_MONITORING_DATA, ALERT_DETAILS } from '../../../common/constants';
import { Expression } from './expression';

export function createMissingMonitoringDataAlertType(): AlertTypeModel {
  return {
    id: ALERT_MISSING_MONITORING_DATA,
    name: ALERT_DETAILS[ALERT_MISSING_MONITORING_DATA].label,
    description: ALERT_DETAILS[ALERT_MISSING_MONITORING_DATA].description,
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/kibana-alerts.html#kibana-alerts-missing-monitoring-data`;
    },
    alertParamsExpression: (props: any) => (
      <Expression
        {...props}
        paramDetails={ALERT_DETAILS[ALERT_MISSING_MONITORING_DATA].paramDetails}
      />
    ),
    validate,
    defaultActionMessage: '{{context.internalFullMessage}}',
    requiresAppContext: true,
  };
}
