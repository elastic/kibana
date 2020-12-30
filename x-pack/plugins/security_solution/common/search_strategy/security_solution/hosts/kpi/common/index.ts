/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Maybe } from '../../../../common';

export interface HostsKpiHistogramData {
  x?: Maybe<number>;
  y?: Maybe<number>;
}

export interface HostsKpiHistogram<T> {
  key_as_string: string;
  key: number;
  doc_count: number;
  count: T;
}

export interface HostsKpiGeneralHistogramCount {
  value: number;
}
