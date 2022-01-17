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
} from '@elastic/eui';

import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { NetworkKpiEmbessablesProps } from './types';
import {
  indexPatternList,
  reportConfigMap,
} from '../../../app/exploratory_view/security_exploratory_view';
import { TimeRange } from '../../../../../../../src/plugins/data/public';
import { setAbsoluteRangeDatePicker } from '../../../common/store/inputs/actions';
import { ReportTypes } from '../../../../../observability/public';
import { StartServices } from '../../../types';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;
const panelHeight = '105px';
const metricHeight = '90px';

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
      <EuiFlexGroup wrap>
        <EuiFlexItem grow={1}>
          <EuiFlexGroup wrap>
            <EuiFlexItem style={{ height: panelHeight }}>
              <EuiPanel color="transparent" hasBorder style={{ height: '100%' }}>
                <ExploratoryViewEmbeddable
                  alignLnsMetric="flex-start"
                  appId="security"
                  title={'Network events'}
                  reportConfigMap={reportConfigMap}
                  dataTypesIndexPatterns={indexPatternList}
                  reportType="singleMetric"
                  attributes={[
                    {
                      reportDefinitions: {
                        'host.name': ['ALL_VALUES'],
                      },
                      name: 'Network events',
                      dataType: 'security',
                      selectedMetricField: 'Records_network_events',
                      operationType: 'count',
                      time: timerange,
                    },
                  ]}
                  compressed
                  disableBorder
                  disableShadow
                  customHeight="100%"
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
                  reportConfigMap={reportConfigMap}
                  dataTypesIndexPatterns={indexPatternList}
                  reportType="singleMetric"
                  attributes={[
                    {
                      reportDefinitions: {
                        'host.name': ['ALL_VALUES'],
                      },
                      name: 'DNS queries',
                      dataType: 'security',
                      selectedMetricField: 'Records_dns_queries',
                      operationType: 'count',
                      time: timerange,
                    },
                  ]}
                  compressed
                  disableBorder
                  disableShadow
                  customHeight="100%"
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
                  reportConfigMap={reportConfigMap}
                  dataTypesIndexPatterns={indexPatternList}
                  reportType="singleMetric"
                  attributes={[
                    {
                      reportDefinitions: {
                        'network.community_id': ['ALL_VALUES'],
                      },
                      name: 'Unique flow IDs',
                      dataType: 'security',
                      selectedMetricField: 'network.community_id',
                      operationType: 'unique_count',
                      time: timerange,
                    },
                  ]}
                  compressed
                  disableBorder
                  disableShadow
                  customHeight="100%"
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
                  reportConfigMap={reportConfigMap}
                  dataTypesIndexPatterns={indexPatternList}
                  reportType="singleMetric"
                  attributes={[
                    {
                      reportDefinitions: {
                        record_tls_handshakes: ['ALL_VALUES'],
                      },
                      name: 'TLS handshakes',
                      dataType: 'security',
                      selectedMetricField: 'Records_tls_handshakes',
                      operationType: 'count',
                      time: timerange,
                    },
                  ]}
                  compressed
                  disableBorder
                  disableShadow
                  customHeight="100%"
                  metricIconColor="#6092c0"
                />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiSplitPanel.Outer
            direction="row"
            grow={true}
            color="transparent"
            hasBorder
            paddingSize="m"
          >
            <EuiSplitPanel.Inner paddingSize="none">
              <StyledEuiFlexGroup direction="column" gutterSize="none">
                <EuiFlexItem style={{ height: metricHeight }} grow={false}>
                  <ExploratoryViewEmbeddable
                    alignLnsMetric="flex-start"
                    appId="security"
                    title={'Unique private IPs'}
                    reportConfigMap={reportConfigMap}
                    dataTypesIndexPatterns={indexPatternList}
                    reportType="singleMetric"
                    attributes={[
                      {
                        reportDefinitions: {
                          records_source_private_ips: ['ALL_VALUES'],
                        },
                        name: 'Source IPs',
                        dataType: 'security', // number (?)
                        selectedMetricField: 'source.ip',
                        time: timerange,
                        operationType: 'count', // unique_count(?)
                      },
                    ]}
                    compressed
                    disableBorder
                    disableShadow
                    customHeight="100%"
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
                    reportConfigMap={reportConfigMap}
                    dataTypesIndexPatterns={indexPatternList}
                    reportType="unique_private_ip"
                    attributes={[
                      {
                        reportDefinitions: {
                          source_private_ip: ['ALL_VALUES'],
                        },
                        name: 'Private source',
                        dataType: 'security',
                        selectedMetricField: 'source.ip',
                        time: { from: 'now-24h', to: 'now' }, // unable to read iso string
                        color: '#D36086',
                      },
                      {
                        reportDefinitions: {
                          destination_private_ip: ['ALL_VALUES'],
                        },
                        name: 'Private Destination',
                        dataType: 'security',
                        selectedMetricField: 'destination.ip',
                        time: { from: 'now-24h', to: 'now' }, // unable to read iso string
                        color: '#9170B8',
                      },
                    ]}
                    legendIsVisible={false}
                    axisTitlesVisibility={{
                      x: false,
                      yLeft: false,
                      yRight: false,
                    }}
                    compressed
                    disableBorder
                    disableShadow
                    customHeight="100%"
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
                    reportConfigMap={reportConfigMap}
                    dataTypesIndexPatterns={indexPatternList}
                    reportType="singleMetric"
                    attributes={[
                      {
                        reportDefinitions: {
                          records_destination_private_ips: ['ALL_VALUES'],
                        },
                        name: 'Destination IPs',
                        dataType: 'security',
                        selectedMetricField: 'destination.ip',
                        time: timerange,
                        operationType: 'unique_count',
                      },
                    ]}
                    compressed
                    disableBorder
                    disableShadow
                    customHeight="100%"
                    metricIcon="visMapCoordinate"
                    metricIconColor="#9170b8"
                    metricPostfix="destination"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiHorizontalRule margin="xs" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <ExploratoryViewEmbeddable
                    appId="security"
                    reportConfigMap={reportConfigMap}
                    dataTypesIndexPatterns={indexPatternList}
                    reportType={ReportTypes.KPI}
                    attributes={[
                      {
                        reportDefinitions: {
                          source_private_ip: ['ALL_VALUES'],
                        },
                        name: 'source.ip',
                        dataType: 'security',
                        selectedMetricField: 'source.ip',
                        time: timerange,
                      },
                      {
                        reportDefinitions: {
                          destination_private_ip: ['ALL_VALUES'],
                        },
                        name: 'destination.ip',
                        dataType: 'security',
                        selectedMetricField: 'destination.ip',
                        time: timerange,
                      },
                    ]}
                    legendIsVisible={false}
                    axisTitlesVisibility={{
                      x: false,
                      yLeft: false,
                      yRight: false,
                    }}
                    compressed
                    disableBorder
                    disableShadow
                    customHeight="100%"
                    onBrushEnd={onBrushEnd}
                  />
                </EuiFlexItem>
              </StyledEuiFlexGroup>
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

NetworkKpiEmbeddablesComponent.displayName = 'NetworkKpiEmbeddablesComponent';
