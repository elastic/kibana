/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import {
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiButton,
  EuiButtonProps,
  EuiLinkProps,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { sendTelemetry } from '../../../shared/telemetry';
import { KibanaContext, IKibanaContext } from '../../../index';

interface IEngineOverviewHeaderProps {
  isButtonDisabled?: boolean;
}

export const EngineOverviewHeader: React.FC<IEngineOverviewHeaderProps> = ({
  isButtonDisabled,
}) => {
  const { enterpriseSearchUrl, http } = useContext(KibanaContext) as IKibanaContext;

  const buttonProps = {
    fill: true,
    iconType: 'popout',
    'data-test-subj': 'launchButton',
  } as EuiButtonProps & EuiLinkProps;

  if (isButtonDisabled) {
    buttonProps.isDisabled = true;
  } else {
    buttonProps.href = `${enterpriseSearchUrl}/as`;
    buttonProps.target = '_blank';
    buttonProps.onClick = () =>
      sendTelemetry({
        http,
        product: 'app_search',
        action: 'clicked',
        metric: 'header_launch_button',
      });
  }

  return (
    <EuiPageHeader>
      <EuiPageHeaderSection>
        <EuiTitle size="l">
          <h1>
            <FormattedMessage
              id="xpack.enterpriseSearch.appSearch.enginesOverview.title"
              defaultMessage="Engine Overview"
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
