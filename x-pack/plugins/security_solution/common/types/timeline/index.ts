/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as runtimeTypes from 'io-ts';

import { stringEnum, unionWithNullType } from '../../utility_types';

export * from './cells';
export * from './columns';
export * from './data_provider';
export * from './rows';
export * from './store';

import type { ExpandedDetailType } from '../detail_panel';

/*
 *  Timeline Statuses
 */

export enum TimelineStatus {
  active = 'active',
  draft = 'draft',
  immutable = 'immutable',
}

export const TimelineStatusLiteralRt = runtimeTypes.union([
  runtimeTypes.literal(TimelineStatus.active),
  runtimeTypes.literal(TimelineStatus.draft),
  runtimeTypes.literal(TimelineStatus.immutable),
]);

const TimelineStatusLiteralWithNullRt = unionWithNullType(TimelineStatusLiteralRt);

export type TimelineStatusLiteralWithNull = runtimeTypes.TypeOf<
  typeof TimelineStatusLiteralWithNullRt
>;

export enum RowRendererId {
  /** event.kind: signal */
  alert = 'alert',
  /** endpoint alerts (created on the endpoint) */
  alerts = 'alerts',
  auditd = 'auditd',
  auditd_file = 'auditd_file',
  library = 'library',
  netflow = 'netflow',
  plain = 'plain',
  registry = 'registry',
  suricata = 'suricata',
  system = 'system',
  system_dns = 'system_dns',
  system_endgame_process = 'system_endgame_process',
  system_file = 'system_file',
  system_fim = 'system_fim',
  system_security_event = 'system_security_event',
  system_socket = 'system_socket',
  threat_match = 'threat_match',
  zeek = 'zeek',
}

export const RowRendererIdRuntimeType = stringEnum(RowRendererId, 'RowRendererId');

// ++++++++ TIMELINE TYPES THAT ARE NEITHER IN THE API, NOR IN THE SAVED OBJECT +++++++++

/**
 * Used for scrolling top inside a tab. Especially when swiching tabs.
 */
export interface ScrollToTopEvent {
  /**
   * Timestamp of the moment when the event happened.
   * The timestamp might be necessary for the scenario where the event could happen multiple times.
   */
  timestamp: number;
}

export type ToggleDetailPanel = ExpandedDetailType & {
  tabType?: TimelineTabs;
  id: string;
};

export enum TimelineTabs {
  query = 'query',
  graph = 'graph',
  notes = 'notes',
  pinned = 'pinned',
  eql = 'eql',
  session = 'session',
}

/*
 *  Timeline IDs
 */

export enum TimelineId {
  active = 'timeline-1',
  casePage = 'timeline-case',
  test = 'timeline-test', // Reserved for testing purposes
  detectionsAlertDetailsPage = 'detections-alert-details-page',
}

export type TimelineEventsType = 'all' | 'raw' | 'alert' | 'signal' | 'custom' | 'eql';
