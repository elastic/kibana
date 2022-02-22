/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSplitPanel,
  EuiTitle,
} from '@elastic/eui';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';

import { TimeRange } from '../../../../../../../src/plugins/data/public';
import { setAbsoluteRangeDatePicker } from '../../../common/store/inputs/actions';
import { kpiUniqueIpsArea } from '../../configs/kpi_unique_ips-area';
import { kpiUniqueIpsBar } from '../../configs/kpi_unique_ips-bar';
import { kpiUniqueIpsDestinationMetric } from '../../configs/kpi_unique_ips-destination_metric';
import { kpiUniqueIpsSourceMetric } from '../../configs/kpi_unique_ips-source_metric';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { EmbeddableHistogram } from '../../../common/components/matrix_histogram/embeddable_histogram';
import {
  SOURCE_UNIT_LABEL,
  DESTINATION_UNIT_LABEL,
} from '../../../network/components/kpi_network/unique_private_ips/translations';
import { UNIQUE_IPS } from '../kpi_hosts/unique_ips/translations';

const metricHeight = '70px';

const sourceMetricOptions = {
  metricIcon: 'visMapCoordinate',
  metricIconColor: '#d36086',
  metricPostfix: SOURCE_UNIT_LABEL,
};

const destinationMetricOptions = {
  metricIcon: 'visMapCoordinate',
  metricIconColor: '#9170b8',
  metricPostfix: DESTINATION_UNIT_LABEL,
};

const StyledEuiPanel = styled(EuiPanel)`
  height: '100%';
  flex-direction: column;
  display: flex;
`;

const StyledInnerPannel = styled(EuiSplitPanel.Inner)`
  width: 50%;
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
  inputsModelId?: InputsModelId;
}

export const KpiUniqueIpsComponent = ({ from, to, inputsModelId = 'global' }: Props) => {
  const timerange = useMemo<TimeRange>(
    () => ({
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      mode: 'absolute',
    }),
    [from, to]
  );
  const dispatch = useDispatch();

  const onBrushEnd = useCallback(
    ({ range }: { range: number[] }) => {
      dispatch(
        setAbsoluteRangeDatePicker({
          id: inputsModelId,
          from: new Date(range[0]).toISOString(),
          to: new Date(range[1]).toISOString(),
        })
      );
    },
    [dispatch, inputsModelId]
  );

  return (
    <StyledEuiPanel color="transparent" hasBorder paddingSize="m">
      <EuiTitle size="xs">
        <h3>{UNIQUE_IPS}</h3>
      </EuiTitle>
      <EuiSplitPanel.Outer direction="row" grow={true} color="transparent" hasBorder={false}>
        <StyledInnerPannel paddingSize="none">
          <StyledEuiFlexGroup direction="column" gutterSize="none">
            <StyledEuiFlexItem grow={false}>
              <EmbeddableHistogram
                customLensAttrs={kpiUniqueIpsSourceMetric}
                customTimeRange={timerange}
                isSingleMetric={true}
                singleMetricOptions={sourceMetricOptions}
              />
            </StyledEuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiHorizontalRule margin="xs" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EmbeddableHistogram
                customLensAttrs={kpiUniqueIpsBar}
                customTimeRange={timerange}
                isSingleMetric={false}
              />
            </EuiFlexItem>
          </StyledEuiFlexGroup>
        </StyledInnerPannel>
        <StyledInnerPannel paddingSize="none">
          <StyledEuiFlexGroup direction="column" gutterSize="none">
            <StyledEuiFlexItem grow={false}>
              <EmbeddableHistogram
                customLensAttrs={kpiUniqueIpsDestinationMetric}
                customTimeRange={timerange}
                isSingleMetric={true}
                singleMetricOptions={destinationMetricOptions}
              />
            </StyledEuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiHorizontalRule margin="xs" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EmbeddableHistogram
                customLensAttrs={kpiUniqueIpsArea}
                customTimeRange={timerange}
                onBrushEnd={onBrushEnd}
                isSingleMetric={false}
              />
            </EuiFlexItem>
          </StyledEuiFlexGroup>
        </StyledInnerPannel>
      </EuiSplitPanel.Outer>
    </StyledEuiPanel>
  );
};

export const KpiUniqueIps = React.memo(KpiUniqueIpsComponent);

KpiUniqueIps.displayName = 'KpiUniqueIps';
