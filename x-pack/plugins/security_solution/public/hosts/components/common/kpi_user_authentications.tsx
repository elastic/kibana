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
import { kpiUserAuthenticationsMetricFailure } from '../../configs/kpi_user_authentication_metric_failure';
import { kpiUserAuthenticationsArea } from '../../configs/kpi_user_authentications_area';
import { kpiUserAuthenticationsBar } from '../../configs/kpi_user_authentications_bar';
import { kpiUserAuthenticationsMetricSuccess } from '../../configs/kpi_user_authentications-metric_success';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { EmbeddableHistogram } from '../../../common/components/matrix_histogram/embeddable_histogram';
import { USER_AUTHENTICATIONS } from '../kpi_hosts/authentications/translations';

const metricHeight = '70px';

const successMetricOptions = {
  metricIcon: 'check',
  metricIconColor: '#54B399',
  metricPostfix: 'success',
};

const failureMetricOptions = {
  metricIcon: 'cross',
  metricIconColor: '#e7664c',
  metricPostfix: 'fail',
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

export const KpiUserAuthenticationsComponents = ({ from, to, inputsModelId = 'global' }: Props) => {
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
        <h3>{USER_AUTHENTICATIONS}</h3>
      </EuiTitle>
      <EuiSplitPanel.Outer direction="row" grow={true} color="transparent" hasBorder={false}>
        <StyledInnerPannel paddingSize="none">
          <StyledEuiFlexGroup direction="column" gutterSize="none">
            <StyledEuiFlexItem grow={false}>
              <EmbeddableHistogram
                customLensAttrs={kpiUserAuthenticationsMetricSuccess}
                customTimeRange={timerange}
                isSingleMetric={true}
                singleMetricOptions={successMetricOptions}
              />
            </StyledEuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiHorizontalRule margin="xs" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EmbeddableHistogram
                customLensAttrs={kpiUserAuthenticationsBar}
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
                customLensAttrs={kpiUserAuthenticationsMetricFailure}
                customTimeRange={timerange}
                isSingleMetric={true}
                singleMetricOptions={failureMetricOptions}
              />
            </StyledEuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiHorizontalRule margin="xs" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EmbeddableHistogram
                customLensAttrs={kpiUserAuthenticationsArea}
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

export const KpiUserAuthentications = React.memo(KpiUserAuthenticationsComponents);

KpiUserAuthentications.displayName = 'KpiUserAuthentications';
