/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

export function AlertsDisclaimer() {
  return (
    <EuiCallOut
      title={i18n.translate('xpack.observability.alertsDisclaimerTitle', {
        defaultMessage: 'Alert history is currently an experimental feature within observability',
      })}
      color="warning"
      iconType="beaker"
    >
      <FormattedMessage
        id="xpack.observability.alertsDisclaimerText"
        defaultMessage="This functionality may change or be removed completely in a future release. We value your {feedback} as we work to add new capabilities. "
        values={{
          feedback: (
            <EuiLink href="https://discuss.elastic.co/c/observability/82" target="_blank">
              {i18n.translate('xpack.observability.alertsDisclaimerLinkText', {
                defaultMessage: 'feedback',
              })}
            </EuiLink>
          ),
        }}
      />
    </EuiCallOut>
  );
}
