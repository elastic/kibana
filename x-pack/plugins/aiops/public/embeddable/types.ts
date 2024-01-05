/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '@kbn/es-query';
import type { ReactElement } from 'react';
import type { EmbeddableInput } from '@kbn/embeddable-plugin/common';
import type { EmbeddableOutput } from '@kbn/embeddable-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { ThemeServiceStart } from '@kbn/core-theme-browser';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { LensPublicStart } from '@kbn/lens-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { ChangePointAnnotation } from '../components/change_point_detection/change_point_detection_context';

export interface EmbeddableChangePointChartProps {
  dataViewId: string;
  timeRange: TimeRange;
  fn: 'avg' | 'sum' | 'min' | 'max' | string;
  metricField: string;
  splitField?: string;
  partitions?: string[];
  maxSeriesToPlot?: number;
  /**
   * Component to render if there are no change points found
   */
  emptyState?: ReactElement;
  /**
   * Outputs the most recent change point data
   */
  onChange?: (changePointData: ChangePointAnnotation[]) => void;
  /**
   * Last reload request time, can be used for manual reload
   */
  lastReloadRequestTime?: number;
}

export type EmbeddableChangePointChartInput = EmbeddableInput & EmbeddableChangePointChartProps;

export type EmbeddableChangePointChartOutput = EmbeddableOutput & { indexPatterns?: DataView[] };

export interface EmbeddableChangePointChartDeps {
  theme: ThemeServiceStart;
  data: DataPublicPluginStart;
  uiSettings: IUiSettingsClient;
  http: CoreStart['http'];
  notifications: CoreStart['notifications'];
  i18n: CoreStart['i18n'];
  lens: LensPublicStart;
  usageCollection: UsageCollectionSetup;
  fieldFormats: FieldFormatsStart;
}
