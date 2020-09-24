/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiTitle,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { I18LABELS } from '../translations';
import { CoreVitals } from '../CoreVitals';
import { KeyUXMetrics } from './KeyUXMetrics';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { useFetcher } from '../../../../hooks/useFetcher';

export interface UXMetrics {
  cls: string;
  fid: string;
  lcp: string;
  tbt: number;
  fcp: number;
  lcpRanks: number[];
  fidRanks: number[];
  clsRanks: number[];
}

export function UXMetrics() {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end, searchTerm } = urlParams;

  const { data, status } = useFetcher(
    (callApmApi) => {
      const { serviceName } = uiFilters;
      if (start && end && serviceName) {
        return callApmApi({
          pathname: '/api/apm/rum-client/web-core-vitals',
          params: {
            query: {
              start,
              end,
              uiFilters: JSON.stringify(uiFilters),
              urlQuery: searchTerm,
            },
          },
        });
      }
      return Promise.resolve(null);
    },
    [start, end, uiFilters, searchTerm]
  );

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = () => setIsPopoverOpen(false);

  return (
    <EuiPanel>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={1} data-cy={`client-metrics`}>
          <EuiTitle size="s">
            <h2>{I18LABELS.userExperienceMetrics}</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <KeyUXMetrics data={data} loading={status !== 'success'} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule />

      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={1} data-cy={`client-metrics`}>
          <EuiTitle size="xs">
            <h3>
              {I18LABELS.coreWebVitals}
              <EuiPopover
                isOpen={isPopoverOpen}
                button={
                  <EuiButtonIcon
                    onClick={() => setIsPopoverOpen(true)}
                    color={'text'}
                    iconType={'questionInCircle'}
                  />
                }
                closePopover={closePopover}
              >
                <div style={{ width: '300px' }}>
                  <EuiText>
                    <FormattedMessage
                      id="xpack.apm.ux.dashboard.webCoreVitals.help"
                      defaultMessage={'Learn more about'}
                    />
                    <EuiLink
                      href="https://web.dev/vitals/"
                      external
                      target="_blank"
                    >
                      {' '}
                      {I18LABELS.coreWebVitals}
                    </EuiLink>
                  </EuiText>
                </div>
              </EuiPopover>
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <CoreVitals data={data} loading={status !== 'success'} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
