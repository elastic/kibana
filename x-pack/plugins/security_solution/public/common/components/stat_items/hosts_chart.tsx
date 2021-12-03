/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { StartServices } from '../../../types';
import {
  indexPatternList,
  reportConfigMap,
} from '../../../app/exploratory_view/security_exploratory_view';

interface Props {
  title?: string;
}
export const HostsChart = ({ title }: Props) => {
  const { observability } = useKibana<StartServices>().services;

  const ExploratoryViewEmbeddable = observability.ExploratoryViewEmbeddable;

  return (
    <EuiFlexGroup>
      <EuiFlexItem style={{ height: 400 }}>
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
        />
        <ExploratoryViewEmbeddable
          appId="security"
          title={'Hosts'}
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
        />
      </EuiFlexItem>
      <EuiFlexItem style={{ height: 400 }}>
        <ExploratoryViewEmbeddable
          appId="security"
          title={'Success'}
          reportConfigMap={reportConfigMap}
          dataTypesIndexPatterns={indexPatternList}
          reportType="singleMetric"
          attributes={[
            {
              reportDefinitions: {
                'host.name': ['ALL_VALUES'],
              },
              name: 'Success',
              dataType: 'security',
              selectedMetricField: 'Records_auth_success',
              time: { from: 'now-24h', to: 'now' },
              operationType: 'count',
            },
          ]}
        />
        <ExploratoryViewEmbeddable
          appId="security"
          title={'User authentications'}
          reportConfigMap={reportConfigMap}
          dataTypesIndexPatterns={indexPatternList}
          reportType="event_outcome"
          attributes={[
            {
              dataType: 'security',
              selectedMetricField: 'even_outcome_success',
              name: 'security-series-1',
              reportDefinitions: {
                'host.name': ['ALL_VALUES'],
              },
              time: {
                from: 'now-1h',
                to: 'now',
              },
            },
            {
              dataType: 'security',
              selectedMetricField: 'even_outcome_failure',
              name: 'security-series-2',
              reportDefinitions: {
                'host.name': ['ALL_VALUES'],
              },
              time: {
                from: 'now-1h',
                to: 'now',
              },
            },
          ]}
          legendIsVisible={false}
          axisTitlesVisibility={{
            x: false,
            yLeft: false,
            yRight: false,
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem style={{ height: 200 }}>
        <ExploratoryViewEmbeddable
          appId="security"
          title={'User authentications'}
          reportConfigMap={reportConfigMap}
          dataTypesIndexPatterns={indexPatternList}
          reportType="kpi-over-time"
          attributes={[
            {
              reportDefinitions: {
                EVENT_SUCCESS: ['ALL_VALUES'],
              },
              name: 'EVENT_SUCCESS',
              dataType: 'security',
              selectedMetricField: 'EVENT_SUCCESS',
              time: { from: 'now-24h', to: 'now' },
            },
            {
              reportDefinitions: {
                EVENT_FAILURE: ['ALL_VALUES'],
              },
              name: 'EVENT_FAILURE',
              dataType: 'security',
              selectedMetricField: 'EVENT_FAILURE',
              time: { from: 'now-24h', to: 'now' },
            },
          ]}
          legendIsVisible={false}
          axisTitlesVisibility={{
            x: false,
            yLeft: false,
            yRight: false,
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem style={{ height: 200 }}>
        <ExploratoryViewEmbeddable
          appId="security"
          title={'Unique IPs'}
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
        />
      </EuiFlexItem>
      <EuiFlexItem style={{ height: 200 }}>
        <ExploratoryViewEmbeddable
          appId="security"
          title={'Unique IPs'}
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
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
