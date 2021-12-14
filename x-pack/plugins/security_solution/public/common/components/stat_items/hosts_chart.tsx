/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiPanel,
  EuiSplitPanel,
} from '@elastic/eui';
import styled from 'styled-components';

import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { StartServices } from '../../../types';
import {
  indexPatternList,
  reportConfigMap,
} from '../../../app/exploratory_view/security_exploratory_view';

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;

const panelHeight = '400px';

export const HostsChart = () => {
  const { observability } = useKibana<StartServices>().services;

  const ExploratoryViewEmbeddable = observability.ExploratoryViewEmbeddable;

  <EuiFlexItem grow={false}>
    <EuiButtonIcon href="" size="s" iconType="visBarVerticalStacked" />
  </EuiFlexItem>;
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem style={{ height: panelHeight }}>
          <EuiPanel color="transparent" hasBorder>
            <StyledEuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem style={{ height: '100px' }} grow={false}>
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
                      time: { from: 'now-24h', to: 'now' },
                    },
                  ]}
                  showExploreButton={false}
                  compressed
                  disableBorder
                  disableShadow
                  customHeight="100%"
                  metricIcon="storage"
                  metricIconColor="#6092c0"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiHorizontalRule margin="s" />
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
                      time: { from: 'now-24h', to: 'now' },
                    },
                  ]}
                  legendIsVisible={false}
                  axisTitlesVisibility={{
                    x: false,
                    yLeft: false,
                    yRight: false,
                  }}
                  showExploreButton={true}
                  compressed
                  disableBorder
                  disableShadow
                  customHeight="100%"
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
                <EuiFlexItem style={{ height: 100 }} grow={false}>
                  <ExploratoryViewEmbeddable
                    alignLnsMetric="flex-start"
                    appId="security"
                    title={'Source IPs'}
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
                        selectedMetricField: 'Records_source_ips',
                        time: { from: 'now-24h', to: 'now' },
                        operationType: 'count', // unique_count(?)
                      },
                    ]}
                    showExploreButton={false}
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
                  <EuiHorizontalRule margin="s" />
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
                        time: { from: 'now-24h', to: 'now' },
                        color: '#D36086',
                      },
                      {
                        reportDefinitions: {
                          unique_ip: ['ALL_VALUES'],
                        },
                        name: 'Unique Destination',
                        dataType: 'security',
                        selectedMetricField: 'destination.ip',
                        time: { from: 'now-24h', to: 'now' },
                        color: '#9170B8',
                      },
                    ]}
                    legendIsVisible={false}
                    axisTitlesVisibility={{
                      x: false,
                      yLeft: false,
                      yRight: false,
                    }}
                    showExploreButton={true}
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
                <EuiFlexItem style={{ height: 100 }} grow={false}>
                  <ExploratoryViewEmbeddable
                    alignLnsMetric="flex-start"
                    appId="security"
                    title={'Destination IPs'}
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
                        selectedMetricField: 'Records_destination_ips',
                        time: { from: 'now-24h', to: 'now' },
                        operationType: 'count',
                      },
                    ]}
                    showExploreButton={false}
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
                  <EuiHorizontalRule margin="s" />
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
                        time: { from: 'now-24h', to: 'now' },
                      },
                      {
                        reportDefinitions: {
                          'destination.ip': ['ALL_VALUES'],
                        },
                        name: 'destination.ip',
                        dataType: 'security',
                        selectedMetricField: 'destination.ip',
                        time: { from: 'now-24h', to: 'now' },
                      },
                    ]}
                    legendIsVisible={false}
                    axisTitlesVisibility={{
                      x: false,
                      yLeft: false,
                      yRight: false,
                    }}
                    showExploreButton={true}
                    compressed
                    disableBorder
                    disableShadow
                    customHeight="100%"
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
