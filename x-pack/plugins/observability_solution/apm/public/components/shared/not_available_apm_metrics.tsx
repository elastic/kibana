/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PopoverBadge } from './popover_badge';
import { useApmPluginContext } from '../../context/apm_plugin/use_apm_plugin_context';

export const NotAvailableApmMetrics = () => {
  const { core } = useApmPluginContext();
  return (
    <PopoverBadge
      title={i18n.translate('xpack.apm.servicesTable.notAvailableApmMetrics.title', {
        defaultMessage: 'Want to see more?',
      })}
      content={i18n.translate('xpack.apm.servicesTable.notAvailableApmMetrics.content', {
        defaultMessage:
          'Understand key metrics like transaction latency, throughput and error rate by instrumenting your service with APM.',
      })}
      footer={
        <EuiButton
          data-test-subj="apmServicesNotAvailableMetricsButton"
          href={core.http.basePath.prepend('/app/apm/tutorial')}
        >
          {i18n.translate('xpack.apm.servicesTable.notAvailableApmMetrics.footer', {
            defaultMessage: 'Add APM',
          })}
        </EuiButton>
      }
    />
  );
};
