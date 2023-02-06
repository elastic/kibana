/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ALERT_REASON } from '@kbn/rule-data-utils';
import { ObservabilityRuleTypeModel } from '@kbn/observability-plugin/public';
import { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { isRight } from 'fp-ts/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { TLSParams, TLSParamsType } from '../../../../common/runtime_types/alerts/tls';
import { CLIENT_ALERT_TYPES } from '../../../../common/constants/uptime_alerts';
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
  ruleParamsExpression: (params: RuleTypeParamsExpressionProps<TLSParams>) => (
    <TLSAlert
      core={core}
      plugins={plugins}
      ruleParams={params.ruleParams}
      setRuleParams={params.setRuleParams}
    />
  ),
  description,
  validate: (ruleParams) => {
    const errors: Record<string, any> = {};
    const decoded = TLSParamsType.decode(ruleParams);

    if (!isRight(decoded)) {
      return {
        errors: {
          typeCheckFailure: 'Provided parameters do not conform to the expected type.',
          typeCheckParsingMessage: PathReporter.report(decoded),
        },
      };
    }

    return { errors };
  },
  defaultActionMessage,
  defaultRecoveryMessage,
  requiresAppContext: false,
  format: ({ fields }) => ({
    reason: fields[ALERT_REASON] || '',
    link: `/app/uptime${CERTIFICATES_ROUTE}`,
  }),
});
