/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSpacer } from '@elastic/eui';
import { EuiLoadingChart } from '@elastic/eui';
import styled from 'styled-components';
import {
  VisitorBreakdownChart,
  VisitorBreakdownMetric,
} from '../charts/visitor_breakdown_chart';
import { I18LABELS, VisitorBreakdownLabel } from '../translations';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useStaticDataView } from '../../../../hooks/use_static_data_view';

const EuiLoadingEmbeddable = styled(EuiFlexGroup)`
  & {
    min-height: 100%;
    min-width: 100%;
  }
`;

export function VisitorBreakdown() {
  const { urlParams, uxUiFilters } = useLegacyUrlParams();
  const { start, end, searchTerm } = urlParams;

  // static dataView is required for lens
  const { dataView, loading } = useStaticDataView();

  return (
    <>
      <EuiTitle size="s">
        <h3>{VisitorBreakdownLabel}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup style={{ height: 'calc(100% - 32px)' }}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>{I18LABELS.browser}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          {!!loading ? (
            <EuiLoadingEmbeddable
              justifyContent="spaceAround"
              alignItems={'center'}
            >
              <EuiFlexItem grow={false}>
                <EuiLoadingChart size="l" mono />
              </EuiFlexItem>
            </EuiLoadingEmbeddable>
          ) : (
            <VisitorBreakdownChart
              dataView={dataView?.id ?? ''}
              start={start ?? ''}
              end={end ?? ''}
              uiFilters={uxUiFilters}
              urlQuery={searchTerm}
              metric={VisitorBreakdownMetric.UA_BREAKDOWN}
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>{I18LABELS.operatingSystem}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          {!!loading ? (
            <EuiLoadingEmbeddable
              justifyContent="spaceAround"
              alignItems={'center'}
            >
              <EuiFlexItem grow={false}>
                <EuiLoadingChart size="l" mono />
              </EuiFlexItem>
            </EuiLoadingEmbeddable>
          ) : (
            <VisitorBreakdownChart
              dataView={dataView?.id ?? ''}
              start={start ?? ''}
              end={end ?? ''}
              uiFilters={uxUiFilters}
              urlQuery={searchTerm}
              metric={VisitorBreakdownMetric.OS_BREAKDOWN}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
