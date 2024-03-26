/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { AnomalySwimlaneEmbeddableFactory } from './anomaly_swimlane';
import type { MlCoreSetup } from '../plugin';
import { AnomalyChartsEmbeddableFactory } from './anomaly_charts';
import { SingleMetricViewerEmbeddableFactory } from './single_metric_viewer';

export {
  ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
  ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
  ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE,
  type AnomalySwimLaneEmbeddableType,
  type AnomalyExplorerChartsEmbeddableType,
  type MlEmbeddableTypes,
} from './constants';
export type {
  MlEmbeddableBaseApi,
  AnomalySwimlaneEmbeddableUserInput,
  AnomalySwimlaneEmbeddableCustomInput,
  AnomalySwimlaneEmbeddableInput,
  AnomalySwimlaneServices,
  AnomalySwimlaneEmbeddableServices,
  AnomalySwimlaneEmbeddableCustomOutput,
  AnomalySwimlaneEmbeddableOutput,
  EditSwimLaneActionApi,
  EditSwimlanePanelContext,
  SwimLaneDrilldownContext,
  AnomalyChartsEmbeddableCustomInput,
  AnomalyChartsEmbeddableInput,
  SingleMetricViewerEmbeddableCustomInput,
  SingleMetricViewerEmbeddableInput,
  AnomalyChartsServices,
  SingleMetricViewerServices,
  AnomalyChartsEmbeddableServices,
  SingleMetricViewerEmbeddableServices,
  AnomalyChartsCustomOutput,
  AnomalyChartsEmbeddableOutput,
  EditAnomalyChartsPanelContext,
  AnomalyChartsFieldSelectionContext,
  MappedEmbeddableTypeOf,
} from './types';

export { getEmbeddableComponent } from './get_embeddable_component';

export function registerEmbeddables(embeddable: EmbeddableSetup, core: MlCoreSetup) {
  const anomalySwimlaneEmbeddableFactory = new AnomalySwimlaneEmbeddableFactory(
    core.getStartServices
  );
  embeddable.registerEmbeddableFactory(
    anomalySwimlaneEmbeddableFactory.type,
    anomalySwimlaneEmbeddableFactory
  );

  const anomalyChartsFactory = new AnomalyChartsEmbeddableFactory(core.getStartServices);
  embeddable.registerEmbeddableFactory(anomalyChartsFactory.type, anomalyChartsFactory);

  const singleMetricViewerFactory = new SingleMetricViewerEmbeddableFactory(core.getStartServices);
  embeddable.registerEmbeddableFactory(singleMetricViewerFactory.type, singleMetricViewerFactory);
}
