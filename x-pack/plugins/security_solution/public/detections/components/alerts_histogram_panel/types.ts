/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { inputsModel } from '../../../common/store';

export interface AlertsHistogramOption {
  text: string;
  value: string;
}

export interface HistogramData {
  x: number;
  y: number;
  g: string;
}

export interface AlertsAggregation {
  alertsByGrouping: {
    buckets: AlertsGroupBucket[];
  };
}

export interface AlertsBucket {
  key_as_string: string;
  key: number;
  doc_count: number;
}

export interface AlertsGroupBucket {
  key: string;
  alerts: {
    buckets: AlertsBucket[];
  };
}

export interface AlertsTotal {
  value: number;
  relation: string;
}

export interface RegisterQuery {
  id: string;
  inspect: inputsModel.InspectQuery | null;
  loading: boolean;
  refetch: inputsModel.Refetch;
}
