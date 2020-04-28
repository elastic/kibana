/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { EuiPageHeader, EuiPageHeaderSection, EuiTitle, EuiButton } from '@elastic/eui';

import { sendTelemetry } from '../../../shared/telemetry';
import { KibanaContext, IKibanaContext } from '../../../index';

export const EngineOverviewHeader: React.FC<> = () => {
  const { enterpriseSearchUrl, http } = useContext(KibanaContext) as IKibanaContext;

  const buttonProps = {
    fill: true,
    iconType: 'popout',
    ['data-test-subj']: 'launchButton',
  };
  if (enterpriseSearchUrl) {
    buttonProps.href = `${enterpriseSearchUrl}/as`;
    buttonProps.target = '_blank';
    buttonProps.onClick = () =>
      sendTelemetry({
        http,
        product: 'app_search',
        action: 'clicked',
        metric: 'header_launch_button',
      });
  } else {
    buttonProps.isDisabled = true;
  }

  return (
    <EuiPageHeader>
      <EuiPageHeaderSection>
        <EuiTitle size="l">
          <h1>Engine Overview</h1>
        </EuiTitle>
      </EuiPageHeaderSection>
      <EuiPageHeaderSection>
        <EuiButton {...buttonProps}>Launch App Search</EuiButton>
      </EuiPageHeaderSection>
    </EuiPageHeader>
  );
};
