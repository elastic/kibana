/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { JsonValue } from 'src/plugins/kibana_utils/common';

export interface AggregatedStat<Stat = JsonValue> {
  key: string;
  value: Stat;
}

export type AggregatedStatProvider<Stat extends JsonValue = JsonValue> = Observable<
  AggregatedStat<Stat>
>;
