/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ALERT_REASON } from '@kbn/rule-data-utils';
import { ObservabilityRuleTypeModel } from '@kbn/observability-plugin/public';
import type { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { ValidationResult } from '@kbn/triggers-actions-ui-plugin/public';
import { TlsTranslations } from '../../../../../common/rules/synthetics/translations';
import { CERTIFICATES_ROUTE } from '../../../../../common/constants/ui';
import { SYNTHETICS_ALERT_RULE_TYPES } from '../../../../../common/constants/synthetics_alerts';
import type { TLSParams } from '../../../../../common/runtime_types/alerts/tls';

import type { AlertTypeInitializer } from './types';

let validateFunc: (ruleParams: any) => ValidationResult;

const { defaultActionMessage, defaultRecoveryMessage, description } = TlsTranslations;
const TLSAlert = React.lazy(() => import('./lazy_wrapper/tls_alert'));

export const initTlsAlertType: AlertTypeInitializer = ({
  core,
  plugins,
}): ObservabilityRuleTypeModel => ({
  id: SYNTHETICS_ALERT_RULE_TYPES.TLS,
  iconClass: 'uptimeApp',
  documentationUrl(docLinks) {
    return `${docLinks.links.observability.syntheticsAlerting}`;
  },
  ruleParamsExpression: (params: RuleTypeParamsExpressionProps<TLSParams>) => (
    <TLSAlert
      coreStart={core}
      plugins={plugins}
      ruleParams={params.ruleParams}
      setRuleParams={params.setRuleParams}
    />
  ),
  description,
  validate: (ruleParams: any) => {
    if (!validateFunc) {
      (async function loadValidate() {
        const { validateTLSAlertParams } = await import('./lazy_wrapper/validate_tls_alert');
        validateFunc = validateTLSAlertParams;
      })();
    }
    return validateFunc ? validateFunc(ruleParams) : ({} as ValidationResult);
  },
  defaultActionMessage,
  defaultRecoveryMessage,
  requiresAppContext: true,
  format: ({ fields }) => ({
    reason: fields[ALERT_REASON] || '',
    link: `/app/synthetics${CERTIFICATES_ROUTE}`,
  }),
});
