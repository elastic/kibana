/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { PopoverBadge } from '../popover_badge';

export function NotAvailableEnvironment() {
  return (
    <PopoverBadge
      title={i18n.translate('xpack.apm.servicesTable.notAvailableEnv.title', {
        defaultMessage: 'No environment detected.',
      })}
      content={
        <FormattedMessage
          id="xpack.apm.servicesTable.notAvailableEnv.content"
          defaultMessage="Declare your service environment by adding {field} to your logs."
          values={{
            field: <EuiCode>service.environment</EuiCode>,
          }}
        />
      }
      footer={
        <EuiLink
          data-test-subj="apmServicesNotAvailableEnvironmentLink"
          href="https://demo.elastic.co/app/observabilityOnboarding/customLogs/?category=logs"
          external
        >
          {i18n.translate('xpack.apm.servicesTable.notAvailableEnv.footer', {
            defaultMessage: 'See documentation',
          })}
        </EuiLink>
      }
    />
  );
}
