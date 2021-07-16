/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AlertTypeModel, ValidationResult } from '../../../../triggers_actions_ui/public';
import { AlertTypeInitializer } from '.';

import { CLIENT_ALERT_TYPES } from '../../../common/constants/alerts';
import { MonitorStatusTranslations } from '../../../common/translations';

const { defaultActionMessage, description } = MonitorStatusTranslations;

const MonitorStatusAlert = React.lazy(() => import('./lazy_wrapper/monitor_status'));

let validateFunc: (alertParams: any) => ValidationResult;

export const initMonitorStatusAlertType: AlertTypeInitializer = ({
  core,
  plugins,
}): AlertTypeModel => ({
  id: CLIENT_ALERT_TYPES.MONITOR_STATUS,
  description,
  iconClass: 'uptimeApp',
  documentationUrl(docLinks) {
    return `${docLinks.ELASTIC_WEBSITE_URL}guide/en/observability/${docLinks.DOC_LINK_VERSION}/monitor-status-alert.html`;
  },
  alertParamsExpression: (params: any) => (
    <MonitorStatusAlert core={core} plugins={plugins} params={params} />
  ),
  validate: (alertParams: any) => {
    if (!validateFunc) {
      (async function loadValidate() {
        const { validateMonitorStatusParams } = await import(
          './lazy_wrapper/validate_monitor_status'
        );
        validateFunc = validateMonitorStatusParams;
      })();
    }
    return validateFunc ? validateFunc(alertParams) : ({} as ValidationResult);
  },
  defaultActionMessage,
  requiresAppContext: false,
});
