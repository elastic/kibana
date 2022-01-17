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
} from '@elastic/eui';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { StartServices } from '../../../types';
import {
  indexPatternList,
  reportConfigMap,
} from '../../../app/exploratory_view/security_exploratory_view';
import { setAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { InputsModelId } from '../../store/inputs/constants';
import { TimeRange } from '../../../../../../../src/plugins/data/public';

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;

const panelHeight = '280px';
const metricHeight = '90px';
interface Props {
  from: string;
  to: string;
  inputsModelId?: InputsModelId;
  indexNames: string[];
}

export const HostCharts = ({ from, to, indexNames, inputsModelId = 'global' }: Props) => {
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

  indexPatternList.security = indexNames.join(',');

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem style={{ height: panelHeight }}>
          <EuiPanel color="transparent" hasBorder>
            <StyledEuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem style={{ height: metricHeight }} grow={false}>
                <ExploratoryViewEmbeddable
                  alignLnsMetric="flex-start"
                  appId="security"
                  title={'Hosts'}
                  reportConfigMap={reportConfigMap}
                  dataTypesIndexPatterns={indexPatternList}
                  reportType="singleMetric"
                  attributes={[
                    {
                      reportDefinitions: {
                        'host.name': ['ALL_VALUES'],
                      },
                      name: 'hosts',
                      dataType: 'security',
                      selectedMetricField: 'host.name',
                      operationType: 'unique_count',
                      time: timerange,
                    },
                  ]}
                  compressed
                  disableBorder
                  disableShadow
                  customHeight="100%"
                  metricIcon="storage"
                  metricIconColor="#6092c0"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiHorizontalRule margin="xs" />
              </EuiFlexItem>
              <EuiFlexItem grow={1}>
                <ExploratoryViewEmbeddable
                  appId="security"
                  reportConfigMap={reportConfigMap}
                  dataTypesIndexPatterns={indexPatternList}
                  reportType="kpi-over-time"
                  attributes={[
                    {
                      reportDefinitions: {
                        'host.name': ['ALL_VALUES'],
                      },
                      name: 'hosts',
                      dataType: 'security',
                      selectedMetricField: 'host.name',
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
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem style={{ height: panelHeight }}>
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
                    title={'Unique IPs'}
                    reportConfigMap={reportConfigMap}
                    dataTypesIndexPatterns={indexPatternList}
                    reportType="singleMetric"
                    attributes={[
                      {
                        reportDefinitions: {
                          'host.name': ['ALL_VALUES'],
                        },
                        name: 'Source IPs',
                        dataType: 'security', // number (?)
                        selectedMetricField: 'source.ip',
                        time: timerange,
                        operationType: 'unique_count',
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
                    reportType="unique_ip"
                    attributes={[
                      {
                        reportDefinitions: {
                          unique_ip: ['ALL_VALUES'],
                        },
                        name: 'Unique source',
                        dataType: 'security',
                        selectedMetricField: 'source.ip',
                        time: { from: 'now-24h', to: 'now' }, // unable to read iso string
                        color: '#D36086',
                      },
                      {
                        reportDefinitions: {
                          unique_ip: ['ALL_VALUES'],
                        },
                        name: 'Unique Destination',
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
                          'host.name': ['ALL_VALUES'],
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
                    reportType="kpi-over-time"
                    attributes={[
                      {
                        reportDefinitions: {
                          'source.ip': ['ALL_VALUES'],
                        },
                        name: 'source.ip',
                        dataType: 'security',
                        selectedMetricField: 'source.ip',
                        time: timerange,
                      },
                      {
                        reportDefinitions: {
                          'destination.ip': ['ALL_VALUES'],
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
    </>
  );
};
