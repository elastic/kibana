/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { PopoverBadge } from '../../../../shared/popover_badge';
import { EuiLink } from '@elastic/eui';

export function apmMetricsNotAvailablePopover() {
  return (
    <PopoverBadge
      title={i18n.translate('xpack.apm.servicesTable.apmMetricsnotAvailable.title', {
        defaultMessage: 'Want to see more?',
      })}
      content={
        <FormattedMessage
          id="xpack.apm.servicesTable.apmMetricsnotAvailable.content"
          defaultMessage="Understand key metrics like transaction latency, throughput and error rate by instrumenting your service with APM."
        />
      }
      footer={
        <EuiLink
          href="https://demo.elastic.co/app/observabilityOnboarding/customLogs/?category=logs"
          external
          data-test-subj="apmMetricsNotAvailablePopoverLink"
        >
          {i18n.translate('xpack.apm.servicesTable.notAvailable.footer', {
            defaultMessage: 'See documentation',
          })}
        </EuiLink>
      }
    />
  );
}
