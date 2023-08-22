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
import { EuiButtonEmpty, EuiLink } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import { ALERTS_PATH } from '../../../common/alerts/constants';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

export interface LinkToAlertsPageProps {
  assetName: string;
  dateRange: TimeRange;
  queryField: string;
}

export const LinkToAlertsPage = ({ assetName, queryField, dateRange }: LinkToAlertsPageProps) => {
  const { services } = useKibanaContextForPlugin();
  const { http } = services;

  const linkToAlertsPage = http.basePath.prepend(
    `${ALERTS_PATH}?_a=${encode({
      kuery: `${queryField}:"${assetName}"`,
      rangeFrom: dateRange.from,
      rangeTo: dateRange.to,
      status: 'all',
    })}`
  );

  return (
    <RedirectAppLinks coreStart={services}>
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
    </RedirectAppLinks>
  );
};

export const LinkToAlertsHomePage = () => {
  const { services } = useKibanaContextForPlugin();
  const { http } = services;

  const linkToAlertsPage = http.basePath.prepend(ALERTS_PATH);

  return (
    <RedirectAppLinks coreStart={services}>
      <EuiLink data-test-subj="assetDetailsTooltipDocumentationLink" href={linkToAlertsPage}>
        <FormattedMessage
          id="xpack.infra.assetDetails.table.tooltip.alertsLink"
          defaultMessage="alerts."
        />
      </EuiLink>
    </RedirectAppLinks>
  );
};
