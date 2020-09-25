/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues } from 'kea';

import { EuiButton, EuiButtonProps, EuiLinkProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { sendTelemetry } from '../../../../shared/telemetry';
import { HttpLogic } from '../../../../shared/http';
import { getWorkplaceSearchUrl } from '../../../../shared/enterprise_search_url';

export const ProductButton: React.FC = () => {
  const { http } = useValues(HttpLogic);

  const buttonProps = {
    fill: true,
    iconType: 'popout',
    'data-test-subj': 'launchButton',
  } as EuiButtonProps & EuiLinkProps;
  buttonProps.href = getWorkplaceSearchUrl();
  buttonProps.target = '_blank';
  buttonProps.onClick = () =>
    sendTelemetry({
      http,
      product: 'workplace_search',
      action: 'clicked',
      metric: 'header_launch_button',
    });

  return (
    <EuiButton {...buttonProps}>
      <FormattedMessage
        id="xpack.enterpriseSearch.workplaceSearch.productCta"
        defaultMessage="Launch Workplace Search"
      />
    </EuiButton>
  );
};
