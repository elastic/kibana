/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { DataViewId } from '../../detection_engine/rule_schema';

export type RiskScoresRequestSchema = t.TypeOf<typeof riskScoresRequestSchema>;
export const riskScoresRequestSchema = t.exact(
  t.partial({
    data_view_id: DataViewId,
    enrich_inputs: t.boolean,
    filter: t.unknown,
    identifier_type: t.string,
    range: t.type({
      start: t.string,
      end: t.string,
    }),
  })
);
