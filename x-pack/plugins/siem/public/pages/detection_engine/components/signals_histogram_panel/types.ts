/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { inputsModel } from '../../../../store';

export interface SignalsHistogramOption {
  text: string;
  value: string;
}

export interface HistogramData {
  x: number;
  y: number;
  g: string;
}

export interface SignalsAggregation {
  signalsByGrouping: {
    buckets: SignalsGroupBucket[];
  };
}

export interface SignalsBucket {
  key_as_string: string;
  key: number;
  doc_count: number;
}

export interface SignalsGroupBucket {
  key: string;
  signals: {
    buckets: SignalsBucket[];
  };
}

export interface SignalsTotal {
  value: number;
  relation: string;
}

export interface RegisterQuery {
  id: string;
  inspect: inputsModel.InspectQuery | null;
  loading: boolean;
  refetch: inputsModel.Refetch;
}
