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
import { kpiHostArea } from '../../configs/kpi_host_area';
import { setAbsoluteRangeDatePicker } from '../../../common/store/inputs/actions';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { kpiUniqueIpsArea } from '../../configs/kpi_unique_ips-area';
import { kpiUniqueIpsBar } from '../../configs/kpi_unique_ips-bar';
import { kpiUniqueIpsDestinationMetric } from '../../configs/kpi_unique_ips-destination_metric';
import { kpiHostMetric } from '../../configs/kpi_host_metric';
import { kpiUniqueIpsSourceMetric } from '../../configs/kpi_unique_ips-source_metric';
import { kpiUserAuthenticationsMetricFailure } from '../../configs/kpi_user_authentication_metric_failure';
import { kpiUserAuthenticationsArea } from '../../configs/kpi_user_authentications_area';
import { kpiUserAuthenticationsBar } from '../../configs/kpi_user_authentications_bar';
import { kpiUserAuthenticationsMetricSuccess } from '../../configs/kpi_user_authentications-metric_success';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { EmbeddableHistogram } from '../../../common/components/matrix_histogram/embeddable_histogram';
import {
  SOURCE_UNIT_LABEL,
  DESTINATION_UNIT_LABEL,
} from '../../../network/components/kpi_network/unique_private_ips/translations';

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;

const panelHeight = '280px';
const metricHeight = '70px';
const attrsMapping = {
  kpiHostArea,
  kpiHostMetric,
  kpiUniqueIpsArea,
  kpiUniqueIpsBar,
  kpiUniqueIpsDestinationMetric,
  kpiUniqueIpsSourceMetric,
  kpiUserAuthenticationsMetricFailure,
  kpiUserAuthenticationsArea,
  kpiUserAuthenticationsBar,
  kpiUserAuthenticationsMetricSuccess,
};

interface Props {
  from: string;
  to: string;
  inputsModelId?: InputsModelId;
}

export const ExploratoryChartsComponents = ({ from, to, inputsModelId = 'global' }: Props) => {
  const timerange = useMemo<TimeRange>(
    () => ({
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      mode: 'absolute',
    }),
    [from, to]
  );

  const dispatch = useDispatch();

  const { patternList, dataViewId } = useSourcererDataView();

  const customLensAttrs = useMemo(
    () =>
      Object.keys(attrsMapping).reduce(
        (acc, id) => ({
          ...acc,
          [id]: {
            ...attrsMapping[id],
            references: attrsMapping[id].references.map((ref) => ({ ...ref, id: dataViewId })),
          },
        }),
        {}
      ),
    [dataViewId]
  );

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

  const dataTypesIndexPatterns = useMemo(() => patternList?.join(','), [patternList]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <EuiPanel
          color="transparent"
          hasBorder
          style={{ height: '100%', flexDirection: 'column', display: 'flex' }}
          paddingSize="m"
        >
          <EuiTitle size="xs">
            <h3>{'Hosts'}</h3>
          </EuiTitle>
          <EuiSplitPanel.Outer direction="row" grow={true} color="transparent" hasBorder={false}>
            <EuiSplitPanel.Inner paddingSize="none">
              <StyledEuiFlexGroup direction="column" gutterSize="none">
                <EuiFlexItem style={{ height: metricHeight }} grow={false}>
                  <EmbeddableHistogram
                    dataTypesIndexPatterns={dataTypesIndexPatterns}
                    customLensAttrs={customLensAttrs.kpiHostMetric}
                    customTimeRange={timerange}
                    metricIcon="storage"
                    metricIconColor="#6092c0"
                    isSingleMetric={true}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiHorizontalRule margin="xs" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EmbeddableHistogram
                    dataTypesIndexPatterns={dataTypesIndexPatterns}
                    customLensAttrs={customLensAttrs.kpiHostArea}
                    customTimeRange={timerange}
                    isSingleMetric={false}
                  />
                </EuiFlexItem>
              </StyledEuiFlexGroup>
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem style={{ height: panelHeight }} grow={2}>
        <EuiPanel
          color="transparent"
          hasBorder
          style={{ height: '100%', flexDirection: 'column', display: 'flex' }}
          paddingSize="m"
        >
          <EuiTitle size="xs">
            <h3>{'User authentications'}</h3>
          </EuiTitle>
          <EuiSplitPanel.Outer direction="row" grow={true} color="transparent" hasBorder={false}>
            <EuiSplitPanel.Inner paddingSize="none">
              <StyledEuiFlexGroup direction="column" gutterSize="none">
                <EuiFlexItem style={{ height: metricHeight }} grow={false}>
                  <EmbeddableHistogram
                    dataTypesIndexPatterns={dataTypesIndexPatterns}
                    customLensAttrs={customLensAttrs.kpiUserAuthenticationsMetricSuccess}
                    customTimeRange={timerange}
                    metricIcon="check"
                    metricIconColor="#54B399"
                    metricPostfix="success"
                    isSingleMetric={true}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiHorizontalRule margin="xs" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EmbeddableHistogram
                    dataTypesIndexPatterns={dataTypesIndexPatterns}
                    customLensAttrs={customLensAttrs.kpiUserAuthenticationsBar}
                    customTimeRange={timerange}
                    isSingleMetric={false}
                  />
                </EuiFlexItem>
              </StyledEuiFlexGroup>
            </EuiSplitPanel.Inner>
            <EuiSplitPanel.Inner paddingSize="none">
              <StyledEuiFlexGroup direction="column" gutterSize="none">
                <EuiFlexItem style={{ height: metricHeight }} grow={false}>
                  <EmbeddableHistogram
                    dataTypesIndexPatterns={dataTypesIndexPatterns}
                    metricIcon="cross"
                    metricIconColor="#e7664c"
                    metricPostfix="fail"
                    customLensAttrs={customLensAttrs.kpiUserAuthenticationsMetricFailure}
                    customTimeRange={timerange}
                    isSingleMetric={true}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiHorizontalRule margin="xs" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EmbeddableHistogram
                    dataTypesIndexPatterns={dataTypesIndexPatterns}
                    customLensAttrs={customLensAttrs.kpiUserAuthenticationsArea}
                    customTimeRange={timerange}
                    onBrushEnd={onBrushEnd}
                    isSingleMetric={false}
                  />
                </EuiFlexItem>
              </StyledEuiFlexGroup>
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem style={{ height: panelHeight }} grow={2}>
        <EuiPanel
          color="transparent"
          hasBorder
          style={{ height: '100%', flexDirection: 'column', display: 'flex' }}
          paddingSize="m"
        >
          <EuiTitle size="xs">
            <h3>{'Unique IPs'}</h3>
          </EuiTitle>
          <EuiSplitPanel.Outer direction="row" grow={true} color="transparent" hasBorder={false}>
            <EuiSplitPanel.Inner paddingSize="none">
              <StyledEuiFlexGroup direction="column" gutterSize="none">
                <EuiFlexItem style={{ height: metricHeight }} grow={false}>
                  <EmbeddableHistogram
                    dataTypesIndexPatterns={dataTypesIndexPatterns}
                    customLensAttrs={customLensAttrs.kpiUniqueIpsSourceMetric}
                    customTimeRange={timerange}
                    metricIcon="visMapCoordinate"
                    metricPostfix={SOURCE_UNIT_LABEL}
                    metricIconColor="#d36086"
                    isSingleMetric={true}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiHorizontalRule margin="xs" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EmbeddableHistogram
                    dataTypesIndexPatterns={dataTypesIndexPatterns}
                    customLensAttrs={customLensAttrs.kpiUniqueIpsBar}
                    customTimeRange={timerange}
                    isSingleMetric={false}
                  />
                </EuiFlexItem>
              </StyledEuiFlexGroup>
            </EuiSplitPanel.Inner>
            <EuiSplitPanel.Inner paddingSize="none">
              <StyledEuiFlexGroup direction="column" gutterSize="none">
                <EuiFlexItem style={{ height: metricHeight }} grow={false}>
                  <EmbeddableHistogram
                    dataTypesIndexPatterns={dataTypesIndexPatterns}
                    metricIcon="visMapCoordinate"
                    metricIconColor="#9170b8"
                    metricPostfix={DESTINATION_UNIT_LABEL}
                    customLensAttrs={customLensAttrs.kpiUniqueIpsDestinationMetric}
                    customTimeRange={timerange}
                    isSingleMetric={true}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiHorizontalRule margin="xs" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EmbeddableHistogram
                    dataTypesIndexPatterns={dataTypesIndexPatterns}
                    customLensAttrs={customLensAttrs.kpiUniqueIpsArea}
                    customTimeRange={timerange}
                    onBrushEnd={onBrushEnd}
                    isSingleMetric={false}
                  />
                </EuiFlexItem>
              </StyledEuiFlexGroup>
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const ExploratoryCharts = React.memo(ExploratoryChartsComponents);

ExploratoryCharts.displayName = 'ExploratoryCharts';
