/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import {
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiButton,
  EuiButtonProps,
  EuiLinkProps,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { getAppSearchUrl } from '../../../../shared/enterprise_search_url';
import { TelemetryLogic } from '../../../../shared/telemetry';

export const EnginesOverviewHeader: React.FC = () => {
  const { sendAppSearchTelemetry } = useActions(TelemetryLogic);

  const buttonProps = {
    fill: true,
    iconType: 'popout',
    'data-test-subj': 'launchButton',
    href: getAppSearchUrl(),
    target: '_blank',
    onClick: () =>
      sendAppSearchTelemetry({
        action: 'clicked',
        metric: 'header_launch_button',
      }),
  } as EuiButtonProps & EuiLinkProps;

  return (
    <EuiPageHeader>
      <EuiPageHeaderSection>
        <EuiTitle size="l">
          <h1>
            <FormattedMessage
              id="xpack.enterpriseSearch.appSearch.enginesOverview.title"
              defaultMessage="Engines Overview"
            />
          </h1>
        </EuiTitle>
      </EuiPageHeaderSection>
      <EuiPageHeaderSection>
        <EuiButton {...buttonProps}>
          <FormattedMessage
            id="xpack.enterpriseSearch.appSearch.productCta"
            defaultMessage="Launch App Search"
          />
        </EuiButton>
      </EuiPageHeaderSection>
    </EuiPageHeader>
  );
};
