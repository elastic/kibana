/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { DataViewId } from '../../detection_engine/rule_schema';
import { afterKeysSchema } from '../after_keys';
import { identifierTypeSchema } from '../identifier_types';
import { riskWeightsSchema } from '../risk_weights/schema';

export const riskScorePreviewRequestSchema = t.exact(
  t.partial({
    after_keys: afterKeysSchema,
    data_view_id: DataViewId,
    debug: t.boolean,
    filter: t.unknown,
    page_size: t.number,
    identifier_type: identifierTypeSchema,
    range: t.type({
      start: t.string,
      end: t.string,
    }),
    weights: riskWeightsSchema,
  })
);
export type RiskScorePreviewRequestSchema = t.TypeOf<typeof riskScorePreviewRequestSchema>;
