/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { encode } from '@kbn/rison';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty } from '@elastic/eui';
import type { MetricsTimeInput } from '../../../pages/metrics/metric_detail/hooks/use_metrics_time';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

export interface LinkToAlertsPageProps {
  nodeName: string;
  queryField: string;
  currentTimeRange: MetricsTimeInput;
}

export const LinkToAlertsPage = ({
  nodeName,
  queryField,
  currentTimeRange,
}: LinkToAlertsPageProps) => {
  const { services } = useKibanaContextForPlugin();
  const { http } = services;

  const queryString = encode({
    kuery: `${queryField}:${nodeName}`,
    status: 'all',
    rangeFrom: currentTimeRange.from,
    rangeTo: currentTimeRange.to,
  });

  const linkToAlertsPage = http.basePath.prepend(`/app/observability/alerts?_a=${queryString}`);

  return (
    <RedirectAppLinks coreStart={services}>
      <EuiButtonEmpty
        data-test-subj="hostsView-flyout-alerts-link"
        size="xs"
        iconSide="left"
        iconType="popout"
        flush="both"
        href={linkToAlertsPage}
      >
        <FormattedMessage
          id="xpack.infra.hostsViewPage.flyout.AlertsPageLinkLabel"
          defaultMessage="See all"
        />
      </EuiButtonEmpty>
    </RedirectAppLinks>
  );
};
