/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  STATUS_ACKNOWLEDGED,
  STATUS_CLOSED,
  STATUS_HIGH_LABEL,
  STATUS_LOW_LABEL,
  STATUS_MEDIUM_LABEL,
  STATUS_OPEN,
} from './translations';
import {
  AlertsByStatusAgg,
  AlertsResponse,
  ParsedSeverityBucket,
  ParsedStatusBucket,
  SeverityBucket,
  SeveritySequence,
  StatusBucket,
  StatusSequence,
} from './types';

const label = {
  high: STATUS_HIGH_LABEL,
  medium: STATUS_MEDIUM_LABEL,
  low: STATUS_LOW_LABEL,
};

const status = {
  open: STATUS_OPEN,
  acknowledged: STATUS_ACKNOWLEDGED,
  closed: STATUS_CLOSED,
};

const links = {
  open: null,
  acknowledged: null,
  closed: null,
};

const statusSequence: StatusSequence[] = ['open', 'acknowledged', 'closed'];
const severitySequence: SeveritySequence[] = ['high', 'medium', 'low'];

type SortSeverityBuckets = (
  buckets: SeverityBucket[],
  sequence?: SeveritySequence[]
) => SeverityBucket[];

type SortStatusBuckets = (buckets: StatusBucket[], sequence?: StatusSequence[]) => StatusBucket[];

export const sortSeverityBuckets: SortSeverityBuckets = (buckets, sequence = severitySequence) => {
  const result: SeverityBucket[] = [];
  sequence.forEach((s, idx) => {
    const bucket = buckets.find((b) => b.key === s);
    result[idx] = bucket
      ? {
          ...bucket,
          key: s,
        }
      : {
          key: s,
          doc_count: 0,
        };
  });

  return result;
};

export const sortStatusBuckets: SortStatusBuckets = (buckets, sequence = statusSequence) => {
  const result: StatusBucket[] = [];
  sequence.forEach((s, idx) => {
    const temp = buckets.find((b) => b.key === s);
    result[idx] = temp
      ? {
          ...temp,
          key: s,
        }
      : {
          key: s,
          doc_count: 0,
        };
  });

  return result;
};

export const parseAlertsData = (
  response: AlertsResponse<[], AlertsByStatusAgg>
): ParsedStatusBucket[] => {
  const statusBuckets = sortStatusBuckets(response?.aggregations?.alertsByStatus?.buckets ?? []);

  let parsedStatusBuckets: ParsedStatusBucket[] = [];

  statusBuckets.forEach((statusBucket) => {
    let parsedSeverityBuckets: ParsedSeverityBucket[] = [];

    const severityBuckets = sortSeverityBuckets(statusBucket?.statusBySeverity?.buckets ?? []);
    severityBuckets.forEach((severityBucket: SeverityBucket) => {
      parsedSeverityBuckets = [
        ...parsedSeverityBuckets,
        {
          value: severityBucket.doc_count,
          status: status[statusBucket.key],
          label: label[severityBucket.key],
          group: statusBucket.key,
          key: severityBucket.key,
        },
      ];
    }, []);

    parsedStatusBuckets = [
      ...parsedStatusBuckets,
      {
        ...statusBucket,
        link: links[statusBucket.key],
        buckets: parsedSeverityBuckets,
        label: status[statusBucket.key],
      },
    ];
  });

  return parsedStatusBuckets;
};
