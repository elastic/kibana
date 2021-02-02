/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useRef } from 'react';

import styled from 'styled-components';

import {
  EuiPortal,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Table } from './waterfall_flyout_table';
import { MiddleTruncatedText } from '../../waterfall';
import { WaterfallMetaDataEntry } from '../types';
import { OnFlyoutClose } from './use_flyout';
import { METRIC_TYPE, useUiTracker } from '../../../../../../../observability/public';

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

export interface WaterfallFlyoutProps {
  flyoutData?: WaterfallMetaDataEntry;
  onFlyoutClose: OnFlyoutClose;
  isFlyoutVisible?: boolean;
}

export const WaterfallFlyout = ({
  flyoutData,
  isFlyoutVisible,
  onFlyoutClose,
}: WaterfallFlyoutProps) => {
  const flyoutRef = useRef<HTMLDivElement>(null);
  const trackMetric = useUiTracker({ app: 'uptime' });

  useEffect(() => {
    if (isFlyoutVisible && flyoutData && flyoutRef.current) {
      flyoutRef.current?.focus();
    }
  }, [flyoutData, isFlyoutVisible, flyoutRef]);

  if (!flyoutData || !isFlyoutVisible) {
    return null;
  }

  const { url, details, certificates, requestHeaders, responseHeaders } = flyoutData;

  trackMetric({ metric: 'waterfall_flyout', metricType: METRIC_TYPE.CLICK });

  return (
    <EuiPortal>
      <div
        tab-index={-1}
        ref={flyoutRef}
        data-test-subj="waterfallFlyout"
        aria-labelledby="flyoutTitle"
      >
        <FlyoutContainer size="s" onClose={onFlyoutClose}>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h2 id="flyoutTitle">
                <MiddleTruncatedText text={url} url={url} />
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <Table rows={details} title={DETAILS} />
            {!!requestHeaders && (
              <>
                <EuiSpacer size="m" />
                <Table rows={requestHeaders} title={REQUEST_HEADERS} />
              </>
            )}
            {!!responseHeaders && (
              <>
                <EuiSpacer size="m" />
                <Table rows={responseHeaders} title={RESPONSE_HEADERS} />
              </>
            )}
            {!!certificates && (
              <>
                <EuiSpacer size="m" />
                <Table rows={certificates} title={CERTIFICATES} />
              </>
            )}
          </EuiFlyoutBody>
        </FlyoutContainer>
      </div>
    </EuiPortal>
  );
};
