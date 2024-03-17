/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { getCoreVitalsComponent } from '@kbn/observability-plugin/public';
import { useINPQuery } from '../../../../hooks/use_inp_query';
import { I18LABELS } from '../translations';
import { KeyUXMetrics } from './key_ux_metrics';
import { useUxQuery } from '../hooks/use_ux_query';
import { CsmSharedContext } from '../csm_shared_context';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { getPercentileLabel } from './translations';
import { useCoreWebVitalsQuery } from '../../../../hooks/use_core_web_vitals_query';

export function UXMetrics() {
  const {
    urlParams: { percentile },
  } = useLegacyUrlParams();

  const uxQuery = useUxQuery();

  const { data, loading: loadingResponse } = useCoreWebVitalsQuery(uxQuery);
  const { data: inpData, loading: inpLoading } = useINPQuery(uxQuery);

  const loading = (loadingResponse ?? true) || inpLoading;

  const {
    sharedData: { totalPageViews },
  } = useContext(CsmSharedContext);

  const CoreVitals = useMemo(
    () =>
      getCoreVitalsComponent({
        data: {
          ...data,
          inp: inpData?.inp,
          inpRanks: inpData?.inpRanks,
          hasINP: inpData?.hasINP,
        },
        totalPageViews,
        loading,
        displayTrafficMetric: true,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading, inpLoading]
  );

  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup justifyContent="spaceBetween" wrap responsive={false}>
        <EuiFlexItem grow={1} data-cy={`client-metrics`}>
          <EuiTitle size="xs">
            <h3>
              {I18LABELS.metrics} ({getPercentileLabel(percentile!)})
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <KeyUXMetrics data={data} loading={loading} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiHorizontalRule margin="xs" />

      <EuiFlexGroup justifyContent="spaceBetween" wrap>
        <EuiFlexItem
          grow={1}
          data-cy={`client-metrics`}
          style={{ minHeight: 150 }}
        >
          <EuiSpacer size="s" />
          {CoreVitals}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
