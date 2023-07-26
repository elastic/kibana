/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';
import type { Datatable } from '@kbn/expressions-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TypedLensByValueInput } from '../../../embeddable/embeddable_component';
import type { LensPluginStartDependencies } from '../../../plugin';
import type { DatasourceMap, VisualizationMap } from '../../../types';

export interface EditConfigPanelProps {
  attributes: TypedLensByValueInput['attributes'];
  dataView: DataView;
  updateSuggestion: (datasourceState: unknown, visualizationState: unknown) => void;
  updateAllAttributes?: (attrs: TypedLensByValueInput['attributes']) => void;
  setCurrentAttributes?: (attrs: TypedLensByValueInput['attributes']) => void;
  coreStart: CoreStart;
  startDependencies: LensPluginStartDependencies;
  visualizationMap: VisualizationMap;
  datasourceMap: DatasourceMap;
  closeFlyout?: () => void;
  wrapInFlyout?: boolean;
  panelId?: string;
  datasourceId: 'formBased' | 'textBased';
  adaptersTables?: Record<string, Datatable>;
  canEditTextBasedQuery?: boolean;
}

export interface LayerConfigurationProps {
  attributes: TypedLensByValueInput['attributes'];
  coreStart: CoreStart;
  startDependencies: LensPluginStartDependencies;
  visualizationMap: VisualizationMap;
  datasourceMap: DatasourceMap;
  datasourceId: 'formBased' | 'textBased';
  adaptersTables?: Record<string, Datatable>;
}
