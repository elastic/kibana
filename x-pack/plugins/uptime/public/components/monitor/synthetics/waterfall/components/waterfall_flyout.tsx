/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import styled from 'styled-components';

import { EuiFlyout, EuiFlyoutHeader, EuiFlyoutBody, EuiTitle, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Table } from './waterfall_flyout_table';
import { MiddleTruncatedText } from '../../waterfall';
import { METRIC_TYPE, useUiTracker } from '../../../../../../../observability/public';

import { useWaterfallContext } from '../context/waterfall_chart';

export const DETAILS = i18n.translate('xpack.uptime.synthetics.waterfall.flyout.details', {
  defaultMessage: 'Details',
});

export const CERTIFICATES = i18n.translate(
  'xpack.uptime.synthetics.waterfall.flyout.certificates',
  {
    defaultMessage: 'Certificate headers',
  }
);

export const REQUEST_HEADERS = i18n.translate(
  'xpack.uptime.synthetics.waterfall.flyout.requestHeaders',
  {
    defaultMessage: 'Request headers',
  }
);

export const RESPONSE_HEADERS = i18n.translate(
  'xpack.uptime.synthetics.waterfall.flyout.responseHeaders',
  {
    defaultMessage: 'Response headers',
  }
);

const FlyoutContainer = styled(EuiFlyout)`
  z-index: ${(props) => props.theme.eui.euiZLevel5};
`;

export const WaterfallFlyout = () => {
  const { flyoutData, isFlyoutVisible, setIsFlyoutVisible } = useWaterfallContext();
  const trackMetric = useUiTracker({ app: 'uptime' });

  if (!flyoutData || !isFlyoutVisible) {
    return null;
  }

  const { url, details, certificates, requestHeaders, responseHeaders } = flyoutData;

  trackMetric({ metric: 'waterfall_flyout', metricType: METRIC_TYPE.CLICK });

  return (
    <FlyoutContainer
      size="s"
      onClose={() => setIsFlyoutVisible(false)}
      aria-labelledby="flyoutTitle"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyoutTitle">
            <MiddleTruncatedText text={url} />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <Table rows={details} title={DETAILS} />
        {!!certificates && (
          <>
            <EuiSpacer size="l" />
            <Table rows={certificates} title={CERTIFICATES} />
          </>
        )}
        {!!requestHeaders && (
          <>
            <EuiSpacer size="l" />
            <Table rows={requestHeaders} title={REQUEST_HEADERS} />
          </>
        )}
        {!!responseHeaders && (
          <>
            <EuiSpacer size="l" />
            <Table rows={responseHeaders} title={RESPONSE_HEADERS} />
          </>
        )}
      </EuiFlyoutBody>
    </FlyoutContainer>
  );
};
