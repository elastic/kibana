/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { RefreshInterval } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { EmbeddableInput, EmbeddableOutput, IEmbeddable } from '@kbn/embeddable-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { MlEntityField } from '@kbn/ml-anomaly-utils';
import type {
  EmbeddableApiContext,
  HasParentApi,
  HasType,
  PublishesDataViews,
  PublishingSubject,
  PublishesWritablePanelTitle,
  PublishesUnifiedSearch,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { JobId } from '../../common/types/anomaly_detection_jobs';
import type { MlDependencies } from '../application/app';
import type { MlCapabilitiesService } from '../application/capabilities/check_capabilities';
import type { SwimlaneType } from '../application/explorer/explorer_constants';
import type { AppStateSelectedCells } from '../application/explorer/explorer_utils';
import type { AnomalyDetectorService } from '../application/services/anomaly_detector_service';
import type { AnomalyExplorerChartsService } from '../application/services/anomaly_explorer_charts_service';
import type { AnomalyTimelineService } from '../application/services/anomaly_timeline_service';
import type { MlFieldFormatService } from '../application/services/field_format_service';
import type { MlJobService } from '../application/services/job_service';
import type { MlApiServices } from '../application/services/ml_api_service';
import type { MlResultsService } from '../application/services/results_service';
import type { MlTimeSeriesSearchService } from '../application/timeseriesexplorer/timeseriesexplorer_utils/time_series_search_service';
import type { TimeSeriesExplorerService } from '../application/util/time_series_explorer_service';
import type { ToastNotificationService } from '../application/services/toast_notification_service';
import type {
  AnomalyExplorerChartsEmbeddableType,
  AnomalySwimLaneEmbeddableType,
  MlEmbeddableTypes,
} from './constants';

/**
 * Common API for all ML embeddables
 */
export interface MlEmbeddableBaseApi<StateType extends object = object>
  extends DefaultEmbeddableApi<StateType>,
    PublishesUnifiedSearch {}

export interface MlEmbeddableBaseApiWithDataViews extends MlEmbeddableBaseApi, PublishesDataViews {}

export type MlEntity = Record<string, MlEntityField['fieldValue']>;

/** Manual input by the user */
export interface AnomalySwimlaneEmbeddableUserInput {
  jobIds: JobId[];
  panelTitle: string;
  swimlaneType: SwimlaneType;
  viewBy?: string;
}

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
  indexPatterns: DataView[];
}

export type AnomalySwimlaneEmbeddableOutput = EmbeddableOutput &
  AnomalySwimlaneEmbeddableCustomOutput;

export type EditSwimLaneActionApi = HasType<AnomalySwimLaneEmbeddableType> &
  Partial<HasParentApi<PublishesUnifiedSearch>>;

export interface EditSwimlanePanelContext extends EmbeddableApiContext {
  embeddable: EditSwimLaneActionApi;
}

export interface SwimLaneDrilldownContext extends EditSwimlanePanelContext {
  /**
   * Optional data provided by swim lane selection
   */
  data?: AppStateSelectedCells;
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

/** Manual input by the user */
export interface SingleMetricViewerEmbeddableUserInput {
  jobIds: JobId[];
  functionDescription?: string;
  selectedDetectorIndex: number;
  selectedEntities?: MlEntity;
  panelTitle?: string;
}

export interface SingleMetricViewerEmbeddableCustomInput
  extends Omit<SingleMetricViewerEmbeddableUserInput, 'panelTitle'> {
  id?: string;
  filters?: Filter[];
  query?: Query;
  refreshConfig?: RefreshInterval;
  timeRange: TimeRange | undefined;
}

export type SingleMetricViewerEmbeddableInput = EmbeddableInput &
  SingleMetricViewerEmbeddableCustomInput;

/**
 * Persisted state for the Single Metric Embeddable.
 */
export interface SingleMetricViewerEmbeddableState
  extends SerializedTitles,
    SingleMetricViewerEmbeddableCustomInput {}

export type SingleMetricViewerEmbeddableApi =
  MlEmbeddableBaseApi<SingleMetricViewerEmbeddableState> &
    PublishesWritablePanelTitle &
    SingleMetricViewerComponentApi;

export interface SingleMetricViewerComponentApi {
  functionDescription: PublishingSubject<string | undefined>;
  jobIds: PublishingSubject<JobId[]>;
  selectedDetectorIndex: PublishingSubject<number | undefined>;
  selectedEntities: PublishingSubject<MlEntity | undefined>;

  updateUserInput: (input: Partial<SingleMetricViewerEmbeddableInput>) => void;
}

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
  mlTimeSeriesExplorerService?: TimeSeriesExplorerService;
  toastNotificationService?: ToastNotificationService;
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
  indexPatterns: DataView[];
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

export type MappedEmbeddableTypeOf<TEmbeddableType extends MlEmbeddableTypes> =
  TEmbeddableType extends AnomalySwimLaneEmbeddableType
    ? AnomalySwimlaneEmbeddableInput
    : TEmbeddableType extends AnomalyExplorerChartsEmbeddableType
    ? AnomalyChartsEmbeddableInput
    : unknown;
