/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTheme } from '../../../../../../common/eui_styled_components';
import { InfraMetric } from '../../../graphql/types';
import { InfraFormatterType } from '../../../lib/lib';

export enum InfraMetricLayoutVisualizationType {
  line = 'line',
  area = 'area',
  bar = 'bar',
}

export enum InfraMetricLayoutSectionType {
  chart = 'chart',
  gauges = 'gauges',
}

interface SeriesOverrides {
  type?: InfraMetricLayoutVisualizationType;
  color: string;
  name?: string;
  formatter?: InfraFormatterType;
  formatterTemplate?: string;
}

interface SeriesOverrideObject {
  [name: string]: SeriesOverrides | undefined;
}

export interface InfraMetricLayoutVisualizationConfig {
  stacked?: boolean;
  type?: InfraMetricLayoutVisualizationType;
  formatter?: InfraFormatterType;
  formatterTemplate?: string;
  bounds?: { min: number; max: number };
  seriesOverrides: SeriesOverrideObject;
}

export interface InfraMetricLayoutSection {
  id: InfraMetric;
  linkToId?: string;
  label: string;
  requires: string[];
  visConfig: InfraMetricLayoutVisualizationConfig;
  type: InfraMetricLayoutSectionType;
}

export interface InfraMetricLayout {
  id: string;
  label: string;
  sections: InfraMetricLayoutSection[];
}

export type InfraMetricLayoutCreator = (theme: EuiTheme) => InfraMetricLayout[];
