/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { RefreshInterval } from '@kbn/data-plugin/common';
import type { DefaultEmbeddableApi, EmbeddableInput } from '@kbn/embeddable-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { MlEntityField } from '@kbn/ml-anomaly-utils';
import type {
  EmbeddableApiContext,
  HasEditCapabilities,
  HasParentApi,
  HasType,
  PublishesUnifiedSearch,
  PublishingSubject,
  PublishesTimeRange,
  PublishesWritablePanelTitle,
  PublishesDataViews,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import { type BehaviorSubject } from 'rxjs';
import type { JobId } from '../../common/types/anomaly_detection_jobs';
import type { MlDependencies } from '../application/app';
import type { MlCapabilitiesService } from '../application/capabilities/check_capabilities';
import type { SwimlaneType } from '../application/explorer/explorer_constants';
import type { AppStateSelectedCells } from '../application/explorer/explorer_utils';
import type { AnomalyDetectorService } from '../application/services/anomaly_detector_service';
import type { AnomalyExplorerChartsService } from '../application/services/anomaly_explorer_charts_service';
import type { AnomalyTimelineService } from '../application/services/anomaly_timeline_service';
import type { MlFieldFormatService } from '../application/services/field_format_service';
import type { MlApi } from '../application/services/ml_api_service';
import type { MlResultsService } from '../application/services/results_service';
import type { TimeSeriesExplorerService } from '../application/util/time_series_explorer_service';
import type { ToastNotificationService } from '../application/services/toast_notification_service';
import type {
  AnomalyExplorerChartsEmbeddableType,
  AnomalySwimLaneEmbeddableType,
  MlEmbeddableTypes,
} from './constants';

export type {
  AnomalySwimLaneEmbeddableState,
  AnomalySwimLaneEmbeddableApi,
} from './anomaly_swimlane/types';

/**
 * Common API for all ML embeddables
 */
export interface MlEmbeddableBaseApi<StateType extends object = object>
  extends DefaultEmbeddableApi<StateType>,
    PublishesTimeRange {}

export type MlEntity = Record<string, MlEntityField['fieldValue']>;

/** Manual input by the user */
export interface AnomalySwimlaneEmbeddableUserInput {
  jobIds: JobId[];
  panelTitle?: string;
  swimlaneType: SwimlaneType;
  viewBy?: string;
}

export interface AnomalySwimlaneEmbeddableCustomInput
  extends Omit<AnomalySwimlaneEmbeddableUserInput, 'panelTitle'> {
  id?: string;
  perPage?: number;

  // Embeddable inputs which are not included in the default interface
  filters?: Filter[];
  query?: Query;
  refreshConfig?: RefreshInterval;
  timeRange: TimeRange | undefined;
}

export interface AnomalySwimlaneServices {
  anomalyDetectorService: AnomalyDetectorService;
  anomalyTimelineService: AnomalyTimelineService;
}

export type AnomalySwimlaneEmbeddableServices = [
  CoreStart,
  MlDependencies,
  AnomalySwimlaneServices
];

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
 * Anomaly Explorer Charts
 */

export interface AnomalyChartsEmbeddableRuntimeState {
  jobIds: JobId[];
  maxSeriesToPlot: number;
  // Embeddable inputs which are not included in the default interface
  severityThreshold?: number;
  selectedEntities?: MlEntityField[];
}
export interface AnomalyChartsEmbeddableOverridableState
  extends AnomalyChartsEmbeddableRuntimeState {
  timeRange?: TimeRange;
}
export interface AnomalyChartsComponentApi {
  jobIds$: PublishingSubject<JobId[]>;
  maxSeriesToPlot$: PublishingSubject<number>;
  severityThreshold$: PublishingSubject<number>;
  selectedEntities$: PublishingSubject<MlEntityField[] | undefined>;
  updateUserInput: (input: AnomalyChartsEmbeddableOverridableState) => void;
  updateSeverityThreshold: (v?: number) => void;
  updateSelectedEntities: (entities?: MlEntityField[] | undefined) => void;
}
export interface AnomalyChartsDataLoadingApi {
  onRenderComplete: () => void;
  onLoading: (v: boolean) => void;
  onError: (error?: Error) => void;
}

/**
 * Persisted state for the Anomaly Charts Embeddable.
 */
export interface AnomalyChartsEmbeddableState
  extends SerializedTitles,
    AnomalyChartsEmbeddableOverridableState {}

export type AnomalyChartsApi = AnomalyChartsComponentApi & AnomalyChartsDataLoadingApi;

export type AnomalyChartsEmbeddableApi = MlEmbeddableBaseApi<AnomalyChartsEmbeddableState> &
  PublishesDataViews &
  PublishesWritablePanelTitle &
  HasEditCapabilities &
  AnomalyChartsApi;

export interface AnomalyChartsFieldSelectionApi {
  jobIds: PublishingSubject<JobId[]>;
  entityFields: PublishingSubject<MlEntityField[] | undefined>;
}

export interface AnomalyChartsAttachmentState extends AnomalyChartsEmbeddableState {
  query?: Query;
  filters?: Filter[];
}

export interface AnomalyChartsAttachmentApi extends AnomalyChartsApi {
  parentApi: {
    query$: BehaviorSubject<Query | undefined>;
    filters$: BehaviorSubject<Filter[] | undefined>;
    timeRange$: BehaviorSubject<TimeRange | undefined>;
  };
}

/**
 * Persisted state for the Anomaly Charts Embeddable.
 */
export interface AnomalyChartsEmbeddableState
  extends SerializedTitles,
    AnomalyChartsEmbeddableOverridableState {}

/** Manual input by the user */
export interface SingleMetricViewerEmbeddableUserInput {
  forecastId?: string;
  functionDescription?: string;
  jobIds: JobId[];
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
    HasEditCapabilities &
    SingleMetricViewerComponentApi;

/**
 * The subset of the single metric viewer Embeddable state that is actually used by the single metric viewer embeddable.
 *
 * TODO: Ideally this should be the same as the SingleMetricViewerEmbeddableState, but that type is used in many
 * places, so we cannot change it at the moment.
 */
export type SingleMetricViewerRuntimeState = Omit<
  SingleMetricViewerEmbeddableState,
  'id' | 'filters' | 'query' | 'refreshConfig' | 'forecastId'
>;

export interface SingleMetricViewerComponentApi {
  forecastId: PublishingSubject<string | undefined>;
  functionDescription: PublishingSubject<string | undefined>;
  jobIds: PublishingSubject<JobId[]>;
  selectedDetectorIndex: PublishingSubject<number>;
  selectedEntities: PublishingSubject<MlEntity | undefined>;

  updateUserInput: (input: SingleMetricViewerEmbeddableUserInput) => void;
  updateForecastId: (id: string | undefined) => void;
}

export interface AnomalyChartsServices {
  anomalyDetectorService: AnomalyDetectorService;
  anomalyExplorerService: AnomalyExplorerChartsService;
  mlCapabilities: MlCapabilitiesService;
  mlFieldFormatService: MlFieldFormatService;
  mlResultsService: MlResultsService;
  mlApi: MlApi;
}

export interface SingleMetricViewerServices {
  anomalyExplorerService: AnomalyExplorerChartsService;
  anomalyDetectorService: AnomalyDetectorService;
  mlApi: MlApi;
  mlCapabilities: MlCapabilitiesService;
  mlFieldFormatService: MlFieldFormatService;
  mlResultsService: MlResultsService;
  mlTimeSeriesExplorerService?: TimeSeriesExplorerService;
  toastNotificationService?: ToastNotificationService;
}

export type AnomalyChartsEmbeddableServices = [CoreStart, MlDependencies, AnomalyChartsServices];
export type SingleMetricViewerEmbeddableServices = [
  CoreStart,
  MlDependencies,
  SingleMetricViewerServices
];
export interface EditAnomalyChartsPanelContext {
  embeddable: AnomalyChartsEmbeddableApi;
}

export interface AnomalyChartsFieldSelectionContext extends EditAnomalyChartsPanelContext {
  /**
   * Optional fields selected using anomaly charts
   */
  data?: MlEntityField[];
}

export type MappedEmbeddableTypeOf<TEmbeddableType extends MlEmbeddableTypes> =
  TEmbeddableType extends AnomalyExplorerChartsEmbeddableType
    ? AnomalyChartsEmbeddableState
    : unknown;
