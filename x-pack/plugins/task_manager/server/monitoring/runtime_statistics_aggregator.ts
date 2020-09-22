/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Observable } from 'rxjs';
import { JsonObject, JsonValue } from 'src/plugins/kibana_utils/common';

export interface AggregatedStat {
  key: string;
  value: JsonObject | JsonValue;
}

export type AggregatedStatProvider = Observable<AggregatedStat>;
