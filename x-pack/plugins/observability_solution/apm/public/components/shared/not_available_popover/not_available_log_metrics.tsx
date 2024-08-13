/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { PopoverBadge } from '../popover_badge';

export function NotAvailableLogsMetrics() {
  return (
    <PopoverBadge
      title={i18n.translate('xpack.apm.servicesTable.notAvailableLogsMetrics.title', {
        defaultMessage: 'Want to see more?',
      })}
      content={
        <FormattedMessage
          id="xpack.apm.servicesTable.notAvailableLogsMetrics.content"
          defaultMessage="In order to see log metrics against this service, please declare {logLevelLink} in your logs."
          values={{
            logLevelLink: (
              <EuiLink
                data-test-subj="apmNotAvailableLogsMetricsLink"
                href="https://www.elastic.co/guide/en/ecs/current/ecs-log.html#field-log-level"
                target="_blank"
              >
                {i18n.translate(
                  'xpack.apm.servicesTable.notAvailableLogsMetrics.content.logLevelLink',
                  { defaultMessage: 'log.level' }
                )}
              </EuiLink>
            ),
          }}
        />
      }
      footer={
        <EuiLink
          data-test-subj="apmNotAvailableLogsMetricsLink"
          href="https://ela.st/service-logs-level"
          target="_blank"
        >
          {i18n.translate('xpack.apm.servicesTable.notAvailableLogsMetrics.footer.learnMore', {
            defaultMessage: 'Learn more',
          })}
        </EuiLink>
      }
    />
  );
}
