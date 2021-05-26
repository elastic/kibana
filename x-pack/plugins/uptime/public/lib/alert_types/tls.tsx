/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattableAlertTypeModel } from '../../../../observability/public';
import { CLIENT_ALERT_TYPES } from '../../../common/constants/alerts';
import { TlsTranslations } from '../../../common/translations';
import { AlertTypeInitializer } from '.';

const { defaultActionMessage, description } = TlsTranslations;
const TLSAlert = React.lazy(() => import('./lazy_wrapper/tls_alert'));
export const initTlsAlertType: AlertTypeInitializer = ({
  core,
  plugins,
}): FormattableAlertTypeModel => ({
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
  format: ({ fields }) => ({
    reason: fields.reason,
    link: '/app/uptime/certificates',
  }),
});
