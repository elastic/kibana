/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiExpression, EuiFlexItem, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { ValueExpression } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';

interface Props {
  ageThreshold: number;
  expirationThreshold: number;
  setAgeThreshold: (value: number) => void;
  setExpirationThreshold: (value: number) => void;
}

export const AlertTlsComponent: React.FC<Props> = ({
  ageThreshold,
  expirationThreshold,
  setAgeThreshold,
  setExpirationThreshold,
}) => (
  <>
    <EuiSpacer size="m" />
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>
        <EuiExpression
          aria-label={TlsTranslations.criteriaAriaLabel}
          color="success"
          description={TlsTranslations.criteriaDescription}
          value={TlsTranslations.criteriaValue}
        />
      </EuiFlexItem>
      <EuiFlexItem data-test-subj="tlsExpirationThreshold">
        <ValueExpression
          value={expirationThreshold}
          onChangeSelectedValue={(val) => {
            setExpirationThreshold(val);
          }}
          description={TlsTranslations.expirationDescription}
          errors={[]}
        />
      </EuiFlexItem>
      <EuiFlexItem data-test-subj="tlsAgeExpirationThreshold">
        <ValueExpression
          value={ageThreshold}
          onChangeSelectedValue={(val) => {
            setAgeThreshold(val);
          }}
          description={TlsTranslations.ageDescription}
          errors={[]}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="l" />
  </>
);

export const TlsTranslations = {
  criteriaAriaLabel: i18n.translate('xpack.synthetics.rules.tls.criteriaExpression.ariaLabel', {
    defaultMessage:
      'An expression displaying the criteria for the monitors that are being watched by this alert',
  }),
  criteriaDescription: i18n.translate(
    'xpack.synthetics.alerts.tls.criteriaExpression.description',
    {
      defaultMessage: 'when',
      description:
        'The context of this `when` is in the conditional sense, like "when there are three cookies, eat them all".',
    }
  ),
  criteriaValue: i18n.translate('xpack.synthetics.tls.criteriaExpression.value', {
    defaultMessage: 'matching monitor',
  }),
  expirationDescription: i18n.translate('xpack.synthetics.tls.expirationExpression.description', {
    defaultMessage: 'has a certificate expiring within days: ',
  }),
  ageDescription: i18n.translate('xpack.synthetics.tls.ageExpression.description', {
    defaultMessage: 'or older than days: ',
  }),
};
