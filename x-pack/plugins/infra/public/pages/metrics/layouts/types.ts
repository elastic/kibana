/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetric } from '../../../../common/graphql/types';

export interface InfraMetricLayoutVisualizationConfig {
  [key: string]: any;
}

export interface InfraMetricLayoutSection {
  id: InfraMetric;
  label: string;
  requires: string;
  config: InfraMetricLayoutVisualizationConfig;
}

export interface InfraMetricLayout {
  id: string;
  label: string;
  requires: string;
  sections: InfraMetricLayoutSection[];
}
