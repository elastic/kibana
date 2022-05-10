/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ALERT_REASON } from '@kbn/rule-data-utils';
import { ObservabilityRuleTypeModel } from '@kbn/observability-plugin/public';
import { CLIENT_ALERT_TYPES } from '../../../../common/constants/alerts';
import { TlsTranslations } from '../../../../common/translations';
import { AlertTypeInitializer } from '.';

import { CERTIFICATES_ROUTE } from '../../../../common/constants/ui';

const { defaultActionMessage, defaultRecoveryMessage, description } = TlsTranslations;
const TLSAlert = React.lazy(() => import('./lazy_wrapper/tls_alert'));
export const initTlsAlertType: AlertTypeInitializer = ({
  core,
  plugins,
}): ObservabilityRuleTypeModel => ({
  id: CLIENT_ALERT_TYPES.TLS,
  iconClass: 'uptimeApp',
  documentationUrl(docLinks) {
    return `${docLinks.links.observability.tlsCertificate}`;
  },
  ruleParamsExpression: (params: any) => <TLSAlert core={core} plugins={plugins} params={params} />,
  description,
  validate: () => ({ errors: {} }),
  defaultActionMessage,
  defaultRecoveryMessage,
  requiresAppContext: false,
  format: ({ fields }) => ({
    reason: fields[ALERT_REASON] || '',
    link: `/app/uptime${CERTIFICATES_ROUTE}`,
  }),
});
