/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import { JobId } from '../../common/types/anomaly_detection_jobs';
import { SwimlaneType } from '../application/explorer/explorer_constants';
import { Filter } from '../../../../../src/plugins/data/common/es_query/filters';
import { Query, RefreshInterval, TimeRange } from '../../../../../src/plugins/data/common/query';
import {
  EmbeddableInput,
  EmbeddableOutput,
  IEmbeddable,
} from '../../../../../src/plugins/embeddable/public';
import { AnomalyDetectorService } from '../application/services/anomaly_detector_service';
import { AnomalyTimelineService } from '../application/services/anomaly_timeline_service';
import { MlDependencies } from '../application/app';
import { AppStateSelectedCells } from '../application/explorer/explorer_utils';

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
