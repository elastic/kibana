/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { AlertTypeModel } from '../../../../triggers_actions_ui/public';
import { CLIENT_ALERT_TYPES } from '../../../common/constants/alerts';
import { DurationAnomalyTranslations } from './translations';
import { AlertTypeInitializer } from '.';

const { name, defaultActionMessage, description } = DurationAnomalyTranslations;
const DurationAnomalyAlert = React.lazy(() => import('./lazy_wrapper/duration_anomaly'));

export const initDurationAnomalyAlertType: AlertTypeInitializer = ({
  core,
  plugins,
}): AlertTypeModel => ({
  id: CLIENT_ALERT_TYPES.DURATION_ANOMALY,
  iconClass: 'uptimeApp',
  documentationUrl(docLinks) {
    return `${docLinks.ELASTIC_WEBSITE_URL}guide/en/uptime/${docLinks.DOC_LINK_VERSION}/uptime-alerting.html`;
  },
  alertParamsExpression: (params: unknown) => (
    <DurationAnomalyAlert core={core} plugins={plugins} params={params} />
  ),
  name,
  description,
  validate: () => ({ errors: {} }),
  defaultActionMessage,
  requiresAppContext: true,
});
