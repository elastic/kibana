/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
  EuiHorizontalRule,
  EuiSplitPanel,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';

import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { NetworkKpiEmbessablesProps } from './types';
import { TimeRange } from '../../../../../../../src/plugins/data/public';
import { setAbsoluteRangeDatePicker } from '../../../common/store/inputs/actions';
import { ReportTypes } from '../../../../../observability/public';
import { StartServices } from '../../../types';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { kpiUniquePrivateIpsSourceMetric } from '../../configs/kpi_unique_private_ips-source_metric';
import { kpiNetworkEvents } from '../../configs/kpi_network_events';
import { kpiUniqueFlowIds } from '../../configs/kpi_unique_flow_ids';
import { kpiTlsHandshakes } from '../../configs/kpi_tls_handshakes';
import { kpiUniquePrivateIpsBar } from '../../configs/kpi_unique_private_ips-bar';
import { kpiUniquePrivateIpsArea } from '../../configs/kpi_unique_private_ips-area';
import { kpiDnsQueries } from '../../configs/kpi_dns_queries';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { kpiUniquePrivateIpsDestinationMetric } from '../../configs/kpi_unique_private_ips-destination_metric';

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;
const panelHeight = '125px';
const metricHeight = '75px';
const attrsMapping = {
  kpiNetworkEvents,
  kpiUniqueFlowIds,
  kpiTlsHandshakes,
  kpiDnsQueries,
  kpiUniquePrivateIpsBar,
  kpiUniquePrivateIpsArea,
  kpiUniquePrivateIpsSourceMetric,
  kpiUniquePrivateIpsDestinationMetric,
};

export const NetworkKpiEmbeddablesComponent = React.memo<NetworkKpiEmbessablesProps>(
  ({ filterQuery, from, to, inputsModelId = 'global' }) => {
    const timerange = useMemo<TimeRange>(
      () => ({
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString(),
        mode: 'absolute',
      }),
      [from, to]
    );
    const dispatch = useDispatch();

    const { observability } = useKibana<StartServices>().services;

    const ExploratoryViewEmbeddable = observability.ExploratoryViewEmbeddable;
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
      <EuiFlexGroup wrap>
        <EuiFlexItem grow={1}>
          <EuiFlexGroup wrap>
            <EuiFlexItem style={{ height: panelHeight }}>
              <EuiPanel color="transparent" hasBorder style={{ height: '100%' }}>
                <ExploratoryViewEmbeddable
                  alignLnsMetric="flex-start"
                  appId="security"
                  title={'Network events'}
                  dataTypesIndexPatterns={dataTypesIndexPatterns}
                  reportType="singleMetric"
                  attributes={[
                    {
                      dataType: 'security',
                    },
                  ]}
                  compressed
                  disableBorder
                  disableShadow
                  customLensAttrs={customLensAttrs.kpiNetworkEvents}
                  customTimeRange={timerange}
                  customHeight="100%"
                  withActions={['save', 'addToCase', 'openInLens']}
                  metricIconColor="#6092c0"
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem style={{ height: panelHeight }}>
              <EuiPanel color="transparent" hasBorder style={{ height: '100%' }}>
                <ExploratoryViewEmbeddable
                  alignLnsMetric="flex-start"
                  appId="security"
                  title={'DNS queries'}
                  dataTypesIndexPatterns={dataTypesIndexPatterns}
                  reportType="singleMetric"
                  attributes={[
                    {
                      dataType: 'security',
                    },
                  ]}
                  compressed
                  disableBorder
                  disableShadow
                  customHeight="100%"
                  customLensAttrs={customLensAttrs.kpiDnsQueries}
                  customTimeRange={timerange}
                  withActions={['save', 'addToCase', 'openInLens']}
                  metricIconColor="#6092c0"
                />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <EuiFlexGroup wrap>
            <EuiFlexItem style={{ height: panelHeight }}>
              <EuiPanel color="transparent" hasBorder style={{ height: '100%' }}>
                <ExploratoryViewEmbeddable
                  alignLnsMetric="flex-start"
                  appId="security"
                  title={'Unique flow IDs'}
                  dataTypesIndexPatterns={dataTypesIndexPatterns}
                  reportType="singleMetric"
                  attributes={[
                    {
                      dataType: 'security',
                    },
                  ]}
                  compressed
                  disableBorder
                  disableShadow
                  customHeight="100%"
                  customLensAttrs={customLensAttrs.kpiUniqueFlowIds}
                  customTimeRange={timerange}
                  withActions={['save', 'addToCase', 'openInLens']}
                  metricIconColor="#6092c0"
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem style={{ height: panelHeight }}>
              <EuiPanel color="transparent" hasBorder style={{ height: '100%' }}>
                <ExploratoryViewEmbeddable
                  alignLnsMetric="flex-start"
                  appId="security"
                  title={'TLS handshakes'}
                  dataTypesIndexPatterns={dataTypesIndexPatterns}
                  reportType="singleMetric"
                  attributes={[
                    {
                      dataType: 'security',
                    },
                  ]}
                  compressed
                  disableBorder
                  disableShadow
                  customHeight="100%"
                  customLensAttrs={customLensAttrs.kpiTlsHandshakes}
                  customTimeRange={timerange}
                  withActions={['save', 'addToCase', 'openInLens']}
                  metricIconColor="#6092c0"
                />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiPanel
            color="transparent"
            hasBorder
            style={{ height: '100%', flexDirection: 'column', display: 'flex' }}
            paddingSize="m"
          >
            <EuiTitle size="xs">
              <h3>{'Unique private IPs'}</h3>
            </EuiTitle>
            <EuiSplitPanel.Outer direction="row" grow={true} color="transparent" hasBorder={false}>
              <EuiSplitPanel.Inner paddingSize="none">
                <StyledEuiFlexGroup direction="column" gutterSize="none">
                  <EuiFlexItem style={{ height: metricHeight }} grow={false}>
                    <ExploratoryViewEmbeddable
                      alignLnsMetric="flex-start"
                      appId="security"
                      // title={'Unique private IPs'}
                      dataTypesIndexPatterns={patternList}
                      reportType="singleMetric"
                      attributes={[
                        {
                          dataType: 'security',
                        },
                      ]}
                      compressed
                      disableBorder
                      disableShadow
                      customHeight="100%"
                      customLensAttrs={customLensAttrs.kpiUniquePrivateIpsSourceMetric}
                      customTimeRange={timerange}
                      withActions={['save', 'addToCase', 'openInLens']}
                      metricIcon="visMapCoordinate"
                      metricPostfix="source"
                      metricIconColor="#d36086"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiHorizontalRule margin="xs" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <ExploratoryViewEmbeddable
                      appId="security"
                      dataTypesIndexPatterns={patternList}
                      reportType="unique_private_ip"
                      attributes={[
                        {
                          dataType: 'security',
                        },
                      ]}
                      compressed
                      disableBorder
                      disableShadow
                      customHeight="100%"
                      customLensAttrs={customLensAttrs.kpiUniquePrivateIpsBar}
                      customTimeRange={timerange}
                      withActions={['save', 'addToCase', 'openInLens']}
                    />
                  </EuiFlexItem>
                </StyledEuiFlexGroup>
              </EuiSplitPanel.Inner>
              <EuiSplitPanel.Inner paddingSize="none">
                <StyledEuiFlexGroup direction="column" gutterSize="none">
                  <EuiFlexItem style={{ height: metricHeight }} grow={false}>
                    <ExploratoryViewEmbeddable
                      alignLnsMetric="flex-start"
                      appId="security"
                      dataTypesIndexPatterns={patternList}
                      reportType="singleMetric"
                      attributes={[
                        {
                          dataType: 'security',
                        },
                      ]}
                      compressed
                      disableBorder
                      disableShadow
                      customHeight="100%"
                      metricIcon="visMapCoordinate"
                      metricIconColor="#9170b8"
                      metricPostfix="destination"
                      customLensAttrs={customLensAttrs.kpiUniquePrivateIpsDestinationMetric}
                      customTimeRange={timerange}
                      withActions={['save', 'addToCase', 'openInLens']}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiHorizontalRule margin="xs" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <ExploratoryViewEmbeddable
                      appId="security"
                      dataTypesIndexPatterns={patternList}
                      reportType={ReportTypes.KPI}
                      attributes={[
                        {
                          dataType: 'security',
                        },
                      ]}
                      compressed
                      disableBorder
                      disableShadow
                      customHeight="100%"
                      customLensAttrs={customLensAttrs.kpiUniquePrivateIpsArea}
                      customTimeRange={timerange}
                      onBrushEnd={onBrushEnd}
                      withActions={['save', 'addToCase', 'openInLens']}
                    />
                  </EuiFlexItem>
                </StyledEuiFlexGroup>
              </EuiSplitPanel.Inner>
            </EuiSplitPanel.Outer>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

NetworkKpiEmbeddablesComponent.displayName = 'NetworkKpiEmbeddablesComponent';
