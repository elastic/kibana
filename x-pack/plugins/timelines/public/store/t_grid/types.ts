/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TGridModel } from './model';

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

/** The state of all timelines is stored here */
export interface TimelineState {
  timelineById: TimelineById;
  autoSavedWarningMsg: AutoSavedWarningMsg;
  showCallOutUnauthorizedMsg: boolean;
  insertTimeline: InsertTimeline | null;
}

export enum TimelineId {
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
