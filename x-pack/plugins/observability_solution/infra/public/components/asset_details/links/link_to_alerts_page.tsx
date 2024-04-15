/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { encode } from '@kbn/rison';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty, EuiLink } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { ALERTS_PATH } from '../../shared/alerts/constants';

export interface LinkToAlertsPageProps {
  assetId: string;
  dateRange: TimeRange;
  queryField: string;
}

export const LinkToAlertsPage = ({ assetId, queryField, dateRange }: LinkToAlertsPageProps) => {
  const { services } = useKibanaContextForPlugin();
  const { http } = services;

  const linkToAlertsPage = http.basePath.prepend(
    `${ALERTS_PATH}?_a=${encode({
      kuery: `${queryField}:"${assetId}"`,
      rangeFrom: dateRange.from,
      rangeTo: dateRange.to,
      status: 'all',
    })}`
  );

  return (
    <EuiButtonEmpty
      data-test-subj="infraAssetDetailsAlertsShowAllButton"
      size="xs"
      iconSide="right"
      iconType="sortRight"
      flush="both"
      href={linkToAlertsPage}
    >
      <FormattedMessage
        id="xpack.infra.assetDetails.flyout.AlertsPageLinkLabel"
        defaultMessage="Show all"
      />
    </EuiButtonEmpty>
  );
};

export const LinkToAlertsHomePage = () => {
  const { services } = useKibanaContextForPlugin();
  const { http } = services;

  const linkToAlertsPage = http.basePath.prepend(ALERTS_PATH);

  return (
    <EuiLink
      style={{ display: 'inline-block' }}
      data-test-subj="assetDetailsTooltipDocumentationLink"
      href={linkToAlertsPage}
    >
      <FormattedMessage
        id="xpack.infra.assetDetails.table.tooltip.alertsLink"
        defaultMessage="alerts."
      />
    </EuiLink>
  );
};
