/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { minimalTimeKeyRT } from '../time';
import type { ResolvedLogView } from './resolved_log_view';

export interface LogViewsStaticConfig {
  messageFields: string[];
}

export const logViewOriginRT = rt.keyof({
  stored: null,
  internal: null,
  inline: null,
  'infra-source-stored': null,
  'infra-source-internal': null,
  'infra-source-fallback': null,
});
export type LogViewOrigin = rt.TypeOf<typeof logViewOriginRT>;

// Kibana data views
export const logDataViewReferenceRT = rt.type({
  type: rt.literal('data_view'),
  dataViewId: rt.string,
});

export type LogDataViewReference = rt.TypeOf<typeof logDataViewReferenceRT>;

// Index name
export const logIndexNameReferenceRT = rt.type({
  type: rt.literal('index_name'),
  indexName: rt.string,
});
export type LogIndexNameReference = rt.TypeOf<typeof logIndexNameReferenceRT>;

export const logIndexReferenceRT = rt.union([logDataViewReferenceRT, logIndexNameReferenceRT]);
export type LogIndexReference = rt.TypeOf<typeof logIndexReferenceRT>;

const logViewCommonColumnConfigurationRT = rt.strict({
  id: rt.string,
});

const logViewTimestampColumnConfigurationRT = rt.strict({
  timestampColumn: logViewCommonColumnConfigurationRT,
});

const logViewMessageColumnConfigurationRT = rt.strict({
  messageColumn: logViewCommonColumnConfigurationRT,
});

export const logViewFieldColumnConfigurationRT = rt.strict({
  fieldColumn: rt.intersection([
    logViewCommonColumnConfigurationRT,
    rt.strict({
      field: rt.string,
    }),
  ]),
});

export const logViewColumnConfigurationRT = rt.union([
  logViewTimestampColumnConfigurationRT,
  logViewMessageColumnConfigurationRT,
  logViewFieldColumnConfigurationRT,
]);
export type LogViewColumnConfiguration = rt.TypeOf<typeof logViewColumnConfigurationRT>;

export const logViewAttributesRT = rt.strict({
  name: rt.string,
  description: rt.string,
  logIndices: logIndexReferenceRT,
  logColumns: rt.array(logViewColumnConfigurationRT),
});

export type LogViewAttributes = rt.TypeOf<typeof logViewAttributesRT>;

export const logViewRT = rt.exact(
  rt.intersection([
    rt.type({
      id: rt.string,
      origin: logViewOriginRT,
      attributes: logViewAttributesRT,
    }),
    rt.partial({
      updatedAt: rt.number,
      version: rt.string,
    }),
  ])
);
export type LogView = rt.TypeOf<typeof logViewRT>;

export const logViewIndexStatusRT = rt.keyof({
  available: null,
  empty: null,
  missing: null,
  unknown: null,
});
export type LogViewIndexStatus = rt.TypeOf<typeof logViewIndexStatusRT>;

export const logViewStatusRT = rt.strict({
  index: logViewIndexStatusRT,
});
export type LogViewStatus = rt.TypeOf<typeof logViewStatusRT>;

export const persistedLogViewReferenceRT = rt.type({
  logViewId: rt.string,
  type: rt.literal('log-view-reference'),
});

export type PersistedLogViewReference = rt.TypeOf<typeof persistedLogViewReferenceRT>;

export const inlineLogViewReferenceRT = rt.type({
  type: rt.literal('log-view-inline'),
  id: rt.string,
  attributes: logViewAttributesRT,
});

export const logViewReferenceRT = rt.union([persistedLogViewReferenceRT, inlineLogViewReferenceRT]);

export type LogViewReference = rt.TypeOf<typeof logViewReferenceRT>;

export type FilterStateInUrl = rt.TypeOf<typeof filterStateInUrlRT>;

export const filterMeta = rt.partial({
  alias: rt.union([rt.string, rt.null]),
  disabled: rt.boolean,
  negate: rt.boolean,
  controlledBy: rt.string,
  group: rt.string,
  index: rt.string,
  isMultiIndex: rt.boolean,
  type: rt.string,
  key: rt.string,
  params: rt.any,
  value: rt.any,
});

export const filter = rt.intersection([
  rt.type({
    meta: filterMeta,
  }),
  rt.partial({
    query: rt.UnknownRecord,
  }),
]);

export const filterStateInUrlRT = rt.partial({
  query: rt.union([
    rt.strict({
      language: rt.string,
      query: rt.union([rt.string, rt.record(rt.string, rt.unknown)]),
    }),
    rt.strict({
      sql: rt.string,
    }),
    rt.strict({
      esql: rt.string,
    }),
  ]),
  filters: rt.array(filter),
  timeRange: rt.strict({
    from: rt.string,
    to: rt.string,
  }),
  refreshInterval: rt.strict({
    pause: rt.boolean,
    value: rt.number,
  }),
});

export const legacyFilterStateInUrlRT = rt.union([
  rt.strict({
    language: rt.string,
    query: rt.union([rt.string, rt.record(rt.string, rt.unknown)]),
  }),
  rt.strict({
    sql: rt.string,
  }),
  rt.strict({
    esql: rt.string,
  }),
]);

export const positionStateInUrlRT = rt.partial({
  position: rt.union([rt.partial(minimalTimeKeyRT.props), rt.null]),
});

export type PositionStateInUrl = rt.TypeOf<typeof positionStateInUrlRT>;

export interface ILogViewsClient {
  getLogView(logViewReference: LogViewReference): Promise<LogView>;
  getResolvedLogView(logViewReference: LogViewReference): Promise<ResolvedLogView>;
  putLogView(
    logViewReference: LogViewReference,
    logViewAttributes: Partial<LogViewAttributes>
  ): Promise<LogView>;
  resolveLogView(logViewId: string, logViewAttributes: LogViewAttributes): Promise<ResolvedLogView>;
}
