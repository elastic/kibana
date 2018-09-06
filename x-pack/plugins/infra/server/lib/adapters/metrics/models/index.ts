/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetric } from '../../../../../common/graphql/types';
import { InfraMetricModelCreator } from '../adapter_types';
import { hostCpuUsage } from './host/hostCpuUsage';
import { hostFilesystem } from './host/hostFilesystem';

interface InfraMetricModels {
  [key: string]: InfraMetricModelCreator;
}

export const metricModels: InfraMetricModels = {
  [InfraMetric.hostCpuUsage]: hostCpuUsage,
  [InfraMetric.hostFilesystem]: hostFilesystem,
};
