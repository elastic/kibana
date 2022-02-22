/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSplitPanel,
  EuiTitle,
} from '@elastic/eui';
import styled from 'styled-components';

import { TimeRange } from '../../../../../../../src/plugins/data/public';
import { kpiHostArea } from '../../configs/kpi_host_area';

import { kpiHostMetric } from '../../configs/kpi_host_metric';

import { EmbeddableHistogram } from '../../../common/components/matrix_histogram/embeddable_histogram';
import { HOSTS } from '../hosts_table/translations';

const metricHeight = '70px';

const hostMetricOptions = {
  metricIcon: 'storage',
  metricIconColor: '#6092c0',
};

const StyledEuiPanel = styled(EuiPanel)`
  height: '100%';
  flex-direction: column;
  display: flex;
`;

const StyledEuiInnerPanel = styled(EuiSplitPanel.Inner)`
  width: 100%;
`;

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;

const StyledEuiFlexItem = styled(EuiFlexItem)`
  height: ${metricHeight};
`;

interface Props {
  from: string;
  to: string;
}

export const KpiHostsComponents = ({ from, to }: Props) => {
  const timerange = useMemo<TimeRange>(
    () => ({
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      mode: 'absolute',
    }),
    [from, to]
  );

  return (
    <StyledEuiPanel color="transparent" hasBorder paddingSize="m">
      <EuiTitle size="xs">
        <h3>{HOSTS}</h3>
      </EuiTitle>
      <EuiSplitPanel.Outer direction="row" grow={true} color="transparent" hasBorder={false}>
        <StyledEuiInnerPanel paddingSize="none">
          <StyledEuiFlexGroup direction="column" gutterSize="none">
            <StyledEuiFlexItem grow={false}>
              <EmbeddableHistogram
                customLensAttrs={kpiHostMetric}
                customTimeRange={timerange}
                isSingleMetric={true}
                singleMetricOptions={hostMetricOptions}
              />
            </StyledEuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiHorizontalRule margin="xs" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EmbeddableHistogram
                customLensAttrs={kpiHostArea}
                customTimeRange={timerange}
                isSingleMetric={false}
              />
            </EuiFlexItem>
          </StyledEuiFlexGroup>
        </StyledEuiInnerPanel>
      </EuiSplitPanel.Outer>
    </StyledEuiPanel>
  );
};

export const KpiHosts = React.memo(KpiHostsComponents);

KpiHosts.displayName = 'KpiHosts';
