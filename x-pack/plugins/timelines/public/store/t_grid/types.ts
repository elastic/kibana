/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Storage } from '../../../../../../src/plugins/kibana_utils/public';
import type { ColumnHeaderOptions } from '../../../common/types';
import type { TGridModel, TGridModelSettings } from './model';

export type { TGridModel };

export interface AutoSavedWarningMsg {
  timelineId: string | null;
  newTimelineModel: TGridModel | null;
}

/** A map of id to timeline  */
export interface TimelineById {
  [id: string]: TGridModel;
}

export interface InsertTimeline {
  graphEventId?: string;
  timelineId: string;
  timelineSavedObjectId: string | null;
  timelineTitle: string;
}

export const EMPTY_TIMELINE_BY_ID: TimelineById = {}; // stable reference

export interface TGridEpicDependencies<State> {
  // kibana$: Observable<CoreStart>;
  storage: Storage;
  tGridByIdSelector: () => (state: State, timelineId: string) => TGridModel;
}

/** The state of all timelines is stored here */
export interface TimelineState {
  timelineById: TimelineById;
}

export enum TimelineId {
  usersPageEvents = 'users-page-events',
  hostsPageEvents = 'hosts-page-events',
  hostsPageExternalAlerts = 'hosts-page-external-alerts',
  detectionsRulesDetailsPage = 'detections-rules-details-page',
  detectionsPage = 'detections-page',
  networkPageExternalAlerts = 'network-page-external-alerts',
  active = 'timeline-1',
  casePage = 'timeline-case',
  test = 'test', // Reserved for testing purposes
  alternateTest = 'alternateTest',
}

export interface InitialyzeTGridSettings extends Partial<TGridModelSettings> {
  id: string;
}

export interface TGridPersistInput extends Partial<Omit<TGridModel, keyof TGridModelSettings>> {
  id: string;
  dateRange: {
    start: string;
    end: string;
  };
  columns: ColumnHeaderOptions[];
  indexNames: string[];
  showCheckboxes?: boolean;
}
