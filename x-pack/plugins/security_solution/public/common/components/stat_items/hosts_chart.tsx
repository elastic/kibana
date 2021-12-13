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

interface Props {
  title?: string;
}

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;

export const HostsChart = ({ title }: Props) => {
  const { observability, http } = useKibana<StartServices>().services;

  const ExploratoryViewEmbeddable = observability.ExploratoryViewEmbeddable;

  // const createExploratoryViewUrl = observability.createExploratoryViewUrl;
  // const href = createExploratoryViewUrl(
  //   { reportType, allSeries: attributes },
  //   http?.basePath.get(),
  //   appId
  // );
  <EuiFlexItem grow={false}>
    <EuiButtonIcon href="" size="s" iconType="visBarVerticalStacked" />
  </EuiFlexItem>;
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem style={{ height: 400 }}>
          <EuiPanel color="transparent" hasBorder>
            <StyledEuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem style={{ height: 100 }} grow={false}>
                <ExploratoryViewEmbeddable
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
                  disableBorder
                  disableShadow
                  customHeight={false}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiHorizontalRule />
              </EuiFlexItem>
              <EuiFlexItem grow={1}>
                <ExploratoryViewEmbeddable
                  appId="security"
                  reportConfigMap={reportConfigMap}
                  dataTypesIndexPatterns={indexPatternList}
                  reportType="kpi-over-time"
                  showExploreButton={false}
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
                  showExploreButton={false}
                  disableBorder
                  disableShadow
                />
              </EuiFlexItem>
            </StyledEuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem style={{ height: 400 }}>
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
                    disableBorder
                    disableShadow
                    customHeight={false}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiHorizontalRule />
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
                    showExploreButton={false}
                    disableBorder
                    disableShadow
                    customHeight={false}
                  />
                </EuiFlexItem>
              </StyledEuiFlexGroup>
            </EuiSplitPanel.Inner>
            <EuiSplitPanel.Inner paddingSize="none">
              <StyledEuiFlexGroup direction="column" gutterSize="none">
                <EuiFlexItem style={{ height: 100 }} grow={false}>
                  <ExploratoryViewEmbeddable
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
                    disableBorder
                    disableShadow
                    customHeight={false}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiHorizontalRule />
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
                    showExploreButton={false}
                    disableBorder
                    disableShadow
                    customHeight={false}
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
