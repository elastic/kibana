/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as runtimeTypes from 'io-ts';

import { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { unionWithNullType } from '../../utility_types';
import { Direction } from '../../search_strategy';

export * from './actions';
export * from './cells';
export * from './data_provider';
export * from './rows';

/*
 *  DataProvider Types
 */

export enum DataProviderType {
  default = 'default',
  template = 'template',
}

/*
 *  Sort Types
 */

const SavedSortObject = runtimeTypes.partial({
  columnId: unionWithNullType(runtimeTypes.string),
  columnType: unionWithNullType(runtimeTypes.string),
  sortDirection: unionWithNullType(runtimeTypes.string),
});
const SavedSortRuntimeType = runtimeTypes.union([
  runtimeTypes.array(SavedSortObject),
  SavedSortObject,
]);

export type Sort = runtimeTypes.TypeOf<typeof SavedSortRuntimeType>;

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

export type TimelineStatusLiteral = runtimeTypes.TypeOf<typeof TimelineStatusLiteralRt>;
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

/*
 *  Timeline Types
 */

export enum TimelineType {
  default = 'default',
  template = 'template',
  test = 'test',
}

export const TimelineTypeLiteralRt = runtimeTypes.union([
  runtimeTypes.literal(TimelineType.template),
  runtimeTypes.literal(TimelineType.default),
  runtimeTypes.literal(TimelineType.test),
]);

export const TimelineTypeLiteralWithNullRt = unionWithNullType(TimelineTypeLiteralRt);

export type TimelineTypeLiteral = runtimeTypes.TypeOf<typeof TimelineTypeLiteralRt>;
export type TimelineTypeLiteralWithNull = runtimeTypes.TypeOf<typeof TimelineTypeLiteralWithNullRt>;

export type TimelineEventsType = 'all' | 'raw' | 'alert' | 'signal' | 'custom' | 'eql';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EmptyObject = Partial<Record<any, never>>;

export type TimelineExpandedEventType =
  | {
      panelView?: 'eventDetail';
      params?: {
        eventId: string;
        indexName: string;
        ecsData?: Ecs;
      };
    }
  | EmptyObject;

export type TimelineExpandedHostType =
  | {
      panelView?: 'hostDetail';
      params?: {
        hostName: string;
      };
    }
  | EmptyObject;

export type TimelineExpandedUserType =
  | {
      panelView?: 'userDetail';
      params?: {
        userName: string;
      };
    }
  | EmptyObject;
enum FlowTargetSourceDest {
  destination = 'destination',
  source = 'source',
}
export type TimelineExpandedNetworkType =
  | {
      panelView?: 'networkDetail';
      params?: {
        ip: string;
        flowTarget: FlowTargetSourceDest;
      };
    }
  | EmptyObject;

export type DataExpandedDetailType =
  | TimelineExpandedEventType
  | TimelineExpandedHostType
  | TimelineExpandedNetworkType
  | TimelineExpandedUserType;

export type DataExpandedDetail = Partial<Record<string, DataExpandedDetailType>>;

export const pageInfoTimeline = runtimeTypes.type({
  pageIndex: runtimeTypes.number,
  pageSize: runtimeTypes.number,
});

export enum SortFieldTimeline {
  title = 'title',
  description = 'description',
  updated = 'updated',
  created = 'created',
}

export const sortFieldTimeline = runtimeTypes.union([
  runtimeTypes.literal(SortFieldTimeline.title),
  runtimeTypes.literal(SortFieldTimeline.description),
  runtimeTypes.literal(SortFieldTimeline.updated),
  runtimeTypes.literal(SortFieldTimeline.created),
]);

export const direction = runtimeTypes.union([
  runtimeTypes.literal(Direction.asc),
  runtimeTypes.literal(Direction.desc),
]);

export const sortTimeline = runtimeTypes.type({
  sortField: sortFieldTimeline,
  sortOrder: direction,
});
