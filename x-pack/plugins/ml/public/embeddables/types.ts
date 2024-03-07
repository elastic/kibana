/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { RefreshInterval } from '@kbn/data-plugin/common';
import type { EmbeddableInput, EmbeddableOutput, IEmbeddable } from '@kbn/embeddable-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { MlEntityField } from '@kbn/ml-anomaly-utils';
import type { JobId } from '../../common/types/anomaly_detection_jobs';
import type { SwimlaneType } from '../application/explorer/explorer_constants';
import type { AnomalyDetectorService } from '../application/services/anomaly_detector_service';
import type { AnomalyTimelineService } from '../application/services/anomaly_timeline_service';
import type { MlDependencies } from '../application/app';
import type { AppStateSelectedCells } from '../application/explorer/explorer_utils';
import type { AnomalyExplorerChartsService } from '../application/services/anomaly_explorer_charts_service';
import type { MlJobService } from '../application/services/job_service';
import type {
  AnomalyExplorerChartsEmbeddableType,
  AnomalySwimLaneEmbeddableType,
  MlEmbeddableTypes,
} from './constants';
import {
  ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
  ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
} from './constants';
import type { MlResultsService } from '../application/services/results_service';
import type { MlApiServices } from '../application/services/ml_api_service';
import type { MlFieldFormatService } from '../application/services/field_format_service';
import type { MlTimeSeriesSearchService } from '../application/timeseriesexplorer/timeseriesexplorer_utils/time_series_search_service';
import type { MlCapabilitiesService } from '../application/capabilities/check_capabilities';

export interface AnomalySwimlaneEmbeddableCustomInput {
  jobIds: JobId[];
  swimlaneType: SwimlaneType;
  viewBy?: string;
  perPage?: number;

  // Embeddable inputs which are not included in the default interface
  filters: Filter[];
  query: Query;
  refreshConfig: RefreshInterval;
  timeRange: TimeRange;
}

export type AnomalySwimlaneEmbeddableInput = EmbeddableInput & AnomalySwimlaneEmbeddableCustomInput;

export interface AnomalySwimlaneServices {
  anomalyDetectorService: AnomalyDetectorService;
  anomalyTimelineService: AnomalyTimelineService;
}

export type AnomalySwimlaneEmbeddableServices = [
  CoreStart,
  MlDependencies,
  AnomalySwimlaneServices
];

export interface AnomalySwimlaneEmbeddableCustomOutput {
  perPage?: number;
  fromPage?: number;
  interval?: number;
  indexPatterns?: DataView[];
}

export type AnomalySwimlaneEmbeddableOutput = EmbeddableOutput &
  AnomalySwimlaneEmbeddableCustomOutput;

export interface EditSwimlanePanelContext {
  embeddable: IEmbeddable<AnomalySwimlaneEmbeddableInput, AnomalySwimlaneEmbeddableOutput>;
}

export interface SwimLaneDrilldownContext extends EditSwimlanePanelContext {
  /**
   * Optional data provided by swim lane selection
   */
  data?: AppStateSelectedCells;
}

export function isSwimLaneEmbeddable(arg: unknown): arg is SwimLaneDrilldownContext {
  return (
    isPopulatedObject(arg, ['embeddable']) &&
    isPopulatedObject(arg.embeddable, ['type']) &&
    arg.embeddable.type === ANOMALY_SWIMLANE_EMBEDDABLE_TYPE
  );
}

/**
 * Anomaly Explorer
 */
export interface AnomalyChartsEmbeddableCustomInput {
  jobIds: JobId[];
  maxSeriesToPlot: number;

  // Embeddable inputs which are not included in the default interface
  filters: Filter[];
  query: Query;
  refreshConfig: RefreshInterval;
  timeRange: TimeRange;
  severityThreshold?: number;
}

export type AnomalyChartsEmbeddableInput = EmbeddableInput & AnomalyChartsEmbeddableCustomInput;

export interface SingleMetricViewerEmbeddableCustomInput {
  jobIds: JobId[];
  title: string;
  functionDescription?: string;
  panelTitle: string;
  selectedDetectorIndex: number;
  selectedEntities: MlEntityField[];
  // Embeddable inputs which are not included in the default interface
  filters: Filter[];
  query: Query;
  refreshConfig: RefreshInterval;
  timeRange: TimeRange;
}

export type SingleMetricViewerEmbeddableInput = EmbeddableInput &
  SingleMetricViewerEmbeddableCustomInput;

export interface AnomalyChartsServices {
  anomalyDetectorService: AnomalyDetectorService;
  anomalyExplorerService: AnomalyExplorerChartsService;
  mlFieldFormatService: MlFieldFormatService;
  mlResultsService: MlResultsService;
  mlApiServices?: MlApiServices;
}

export interface SingleMetricViewerServices {
  anomalyExplorerService: AnomalyExplorerChartsService;
  anomalyDetectorService: AnomalyDetectorService;
  mlApiServices: MlApiServices;
  mlCapabilities: MlCapabilitiesService;
  mlFieldFormatService: MlFieldFormatService;
  mlJobService: MlJobService;
  mlResultsService: MlResultsService;
  mlTimeSeriesSearchService?: MlTimeSeriesSearchService;
}

export type AnomalyChartsEmbeddableServices = [CoreStart, MlDependencies, AnomalyChartsServices];
export type SingleMetricViewerEmbeddableServices = [
  CoreStart,
  MlDependencies,
  SingleMetricViewerServices
];
export interface AnomalyChartsCustomOutput {
  entityFields?: MlEntityField[];
  severity?: number;
  indexPatterns?: DataView[];
}
export type AnomalyChartsEmbeddableOutput = EmbeddableOutput & AnomalyChartsCustomOutput;
export interface EditAnomalyChartsPanelContext {
  embeddable: IEmbeddable<AnomalyChartsEmbeddableInput, AnomalyChartsEmbeddableOutput>;
}
export interface AnomalyChartsFieldSelectionContext extends EditAnomalyChartsPanelContext {
  /**
   * Optional fields selected using anomaly charts
   */
  data?: MlEntityField[];
}
export function isAnomalyExplorerEmbeddable(
  arg: unknown
): arg is AnomalyChartsFieldSelectionContext {
  return (
    isPopulatedObject(arg, ['embeddable']) &&
    isPopulatedObject(arg.embeddable, ['type']) &&
    arg.embeddable.type === ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE
  );
}

export type MappedEmbeddableTypeOf<TEmbeddableType extends MlEmbeddableTypes> =
  TEmbeddableType extends AnomalySwimLaneEmbeddableType
    ? AnomalySwimlaneEmbeddableInput
    : TEmbeddableType extends AnomalyExplorerChartsEmbeddableType
    ? AnomalyChartsEmbeddableInput
    : unknown;
