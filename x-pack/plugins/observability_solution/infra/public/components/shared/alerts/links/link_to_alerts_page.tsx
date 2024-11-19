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
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { ALERTS_PATH } from '../constants';

export interface LinkToAlertsPageProps {
  dateRange: TimeRange;
  kuery?: string;
  ['data-test-subj']: string;
}

export const LinkToAlertsPage = ({
  kuery,
  dateRange,
  ['data-test-subj']: dataTestSubj,
}: LinkToAlertsPageProps) => {
  const { services } = useKibanaContextForPlugin();
  const { http } = services;

  const linkToAlertsPage = http.basePath.prepend(
    `${ALERTS_PATH}?_a=${encode({
      kuery,
      rangeFrom: dateRange.from,
      rangeTo: dateRange.to,
      status: 'all',
    })}`
  );
  return (
    <EuiButtonEmpty
      data-test-subj={dataTestSubj}
      size="xs"
      iconSide="right"
      iconType="sortRight"
      flush="both"
      href={linkToAlertsPage}
    >
      <FormattedMessage id="xpack.infra.AlertsPageLinkLabel" defaultMessage="Show all" />
    </EuiButtonEmpty>
  );
};

export const LinkToAlertsHomePage = ({ dataTestSubj }: { dataTestSubj?: string }) => {
  const { services } = useKibanaContextForPlugin();
  const { http } = services;

  const linkToAlertsPage = http.basePath.prepend(ALERTS_PATH);

  return (
    <EuiLink
      style={{ display: 'inline-block' }}
      data-test-subj={dataTestSubj}
      href={linkToAlertsPage}
    >
      <FormattedMessage
        id="xpack.infra.assetDetails.table.tooltip.alertsLink"
        defaultMessage="alerts."
      />
    </EuiLink>
  );
};
