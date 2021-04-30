/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CLIENT_ALERT_TYPES } from '../../../common/constants/alerts';
import { TlsTranslations } from './translations';
import { AlertTypeInitializer } from '.';

import { FormattableRuleType } from '../../../../observability/public';
import type { UptimeRuleFieldMap } from '../../../common/rules/uptime_rule_field_map';

const { defaultActionMessage, description } = TlsTranslations;
const TLSAlert = React.lazy(() => import('./lazy_wrapper/tls_alert'));
export const initTlsAlertType: AlertTypeInitializer = ({
  core,
  plugins,
}): FormattableRuleType<UptimeRuleFieldMap> => ({
  id: CLIENT_ALERT_TYPES.TLS,
  iconClass: 'uptimeApp',
  documentationUrl(docLinks) {
    return `${docLinks.ELASTIC_WEBSITE_URL}guide/en/uptime/${docLinks.DOC_LINK_VERSION}/uptime-alerting.html#_tls_alerts`;
  },
  alertParamsExpression: (params: any) => (
    <TLSAlert core={core} plugins={plugins} params={params} />
  ),
  description,
  validate: () => ({ errors: {} }),
  defaultActionMessage,
  requiresAppContext: false,
  format: ({ alert }) => ({
    reason: 'test',
    link: 'http://elastic.co',
  }),
});
