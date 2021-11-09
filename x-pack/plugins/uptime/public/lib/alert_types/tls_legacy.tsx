/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AlertTypeModel } from '../../../../triggers_actions_ui/public';
import { CLIENT_ALERT_TYPES } from '../../../common/constants/alerts';
import { TlsTranslationsLegacy } from '../../../common/translations';
import { AlertTypeInitializer } from '.';

const { defaultActionMessage, description } = TlsTranslationsLegacy;
const TLSAlert = React.lazy(() => import('./lazy_wrapper/tls_alert'));
export const initTlsLegacyAlertType: AlertTypeInitializer<AlertTypeModel> = ({
  core,
  plugins,
}): AlertTypeModel => ({
  id: CLIENT_ALERT_TYPES.TLS_LEGACY,
  iconClass: 'uptimeApp',
  documentationUrl(docLinks) {
    return `${docLinks.ELASTIC_WEBSITE_URL}guide/en/observability/${docLinks.DOC_LINK_VERSION}/tls-certificate-alert.html`;
  },
  alertParamsExpression: (params: any) => (
    <TLSAlert core={core} plugins={plugins} params={params} />
  ),
  description,
  validate: () => ({ errors: {} }),
  defaultActionMessage,
  requiresAppContext: false,
});
