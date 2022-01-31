/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TooltipInfo } from '@elastic/charts';
import React from 'react';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { getDurationFormatter } from '../../../../../common/utils/formatters';
import { CustomTooltip } from './custom_tooltip';

type ServiceInstanceMainStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics'>;
type MainStatsServiceInstanceItem =
  ServiceInstanceMainStatistics['currentPeriod'][0];

function getLatencyFormatter(props: TooltipInfo) {
  const maxLatency = Math.max(
    ...props.values.map((value) => {
      const datum = value.datum as unknown as MainStatsServiceInstanceItem;
      return datum.latency ?? 0;
    })
  );
  return getDurationFormatter(maxLatency);
}

export default {
  title: 'shared/charts/InstancesLatencyDistributionChart/CustomTooltip',
  component: CustomTooltip,
};

export function Example(props: TooltipInfo) {
  return (
    <CustomTooltip {...props} latencyFormatter={getLatencyFormatter(props)} />
  );
}
Example.args = {
  header: {
    seriesIdentifier: {
      key: 'groupId{__global__}spec{Instances}yAccessor{(index:0)}splitAccessors{}',
      specId: 'Instances',
      yAccessor: '(index:0)',
      splitAccessors: {},
      seriesKeys: ['(index:0)'],
    },
    valueAccessor: 'y1',
    label: 'Instances',
    value: 9.473837632998105,
    formattedValue: '9.473837632998105',
    markValue: null,
    color: '#6092c0',
    isHighlighted: false,
    isVisible: true,
    datum: {
      serviceNodeName:
        '2f3221afa3f00d3bc07069d69efd5bd4c1607be6155a204551c8fe2e2b5dd750',
      errorRate: 0.03496503496503497,
      latency: 1057231.4125874126,
      throughput: 9.473837632998105,
      cpuUsage: 0.000033333333333333335,
      memoryUsage: 0.18701022939403547,
    },
  },
  values: [
    {
      seriesIdentifier: {
        key: 'groupId{__global__}spec{Instances}yAccessor{(index:0)}splitAccessors{}',
        specId: 'Instances',
      },
      valueAccessor: 'y1',
      label: 'Instances',
      value: 1057231.4125874126,
      formattedValue: '1057231.4125874126',
      markValue: null,
      color: '#6092c0',
      isHighlighted: true,
      isVisible: true,
      datum: {
        serviceNodeName:
          '2f3221afa3f00d3bc07069d69efd5bd4c1607be6155a204551c8fe2e2b5dd750',
        errorRate: 0.03496503496503497,
        latency: 1057231.4125874126,
        throughput: 9.473837632998105,
        cpuUsage: 0.000033333333333333335,
        memoryUsage: 0.18701022939403547,
      },
    },
  ],
} as TooltipInfo;

export function MultipleInstances(props: TooltipInfo) {
  return (
    <CustomTooltip {...props} latencyFormatter={getLatencyFormatter(props)} />
  );
}
MultipleInstances.args = {
  header: {
    seriesIdentifier: {
      key: 'groupId{__global__}spec{Instances}yAccessor{(index:0)}splitAccessors{}',
      specId: 'Instances',
      yAccessor: '(index:0)',
      splitAccessors: {},
      seriesKeys: ['(index:0)'],
    },
    valueAccessor: 'y1',
    label: 'Instances',
    value: 9.606338858634443,
    formattedValue: '9.606338858634443',
    markValue: null,
    color: '#6092c0',
    isHighlighted: false,
    isVisible: true,
    datum: {
      serviceNodeName:
        '3b50ad269c45be69088905c4b355cc75ab94aaac1b35432bb752050438f4216f',
      errorRate: 0.006896551724137931,
      latency: 56465.53793103448,
      throughput: 9.606338858634443,
      cpuUsage: 0.0001,
      memoryUsage: 0.1872131360014741,
    },
  },
  values: [
    {
      seriesIdentifier: {
        key: 'groupId{__global__}spec{Instances}yAccessor{(index:0)}splitAccessors{}',
        specId: 'Instances',
      },
      valueAccessor: 'y1',
      label: 'Instances',
      value: 56465.53793103448,
      formattedValue: '56465.53793103448',
      markValue: null,
      color: '#6092c0',
      isHighlighted: true,
      isVisible: true,
      datum: {
        serviceNodeName:
          '3b50ad269c45be69088905c4b355cc75ab94aaac1b35432bb752050438f4216f',
        errorRate: 0.006896551724137931,
        latency: 56465.53793103448,
        throughput: 9.606338858634443,
        cpuUsage: 0.0001,
        memoryUsage: 0.1872131360014741,
      },
    },
    {
      seriesIdentifier: {
        key: 'groupId{__global__}spec{Instances}yAccessor{(index:0)}splitAccessors{}',
        specId: 'Instances',
      },
      valueAccessor: 'y1',
      label: 'Instances',
      value: 56465.53793103448,
      formattedValue: '56465.53793103448',
      markValue: null,
      color: '#6092c0',
      isHighlighted: true,
      isVisible: true,
      datum: {
        serviceNodeName:
          '3b50ad269c45be69088905c4b355cc75ab94aaac1b35432bb752050438f4216f (2)',
        errorRate: 0.006896551724137931,
        latency: 56465.53793103448,
        throughput: 9.606338858634443,
        cpuUsage: 0.0001,
        memoryUsage: 0.1872131360014741,
      },
    },
  ],
} as TooltipInfo;
