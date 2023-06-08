/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { logViewReferenceRT } from '../../../log_views';

export const LOG_ENTRIES_SUMMARY_PATH = '/api/log_entries/summary';

export const logEntriesSummaryRequestRT = rt.type({
  logView: logViewReferenceRT,
  startTimestamp: rt.number,
  endTimestamp: rt.number,
  bucketSize: rt.number,
  query: rt.union([rt.string, rt.undefined, rt.null]),
});

export type LogEntriesSummaryRequest = rt.TypeOf<typeof logEntriesSummaryRequestRT>;

export const logEntriesSummaryBucketRT = rt.type({
  start: rt.number,
  end: rt.number,
  entriesCount: rt.number,
});

export type LogEntriesSummaryBucket = rt.TypeOf<typeof logEntriesSummaryBucketRT>;

export const logEntriesSummaryResponseRT = rt.type({
  data: rt.type({
    start: rt.number,
    end: rt.number,
    buckets: rt.array(logEntriesSummaryBucketRT),
  }),
});

export type LogEntriesSummaryResponse = rt.TypeOf<typeof logEntriesSummaryResponseRT>;
