/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
// TODO https://github.com/elastic/security-team/issues/7491
// eslint-disable-next-line no-restricted-imports
import { DataViewId } from '../../api/detection_engine/model/rule_schema_legacy';
import { afterKeysSchema } from '../after_keys';
import { identifierTypeSchema } from '../identifier_types';
import { riskWeightsSchema } from '../risk_weights/schema';

export const riskScoreCalculationRequestSchema = t.exact(
  t.intersection([
    t.type({
      data_view_id: DataViewId,
      identifier_type: identifierTypeSchema,
      range: t.type({
        start: t.string,
        end: t.string,
      }),
    }),
    t.partial({
      after_keys: afterKeysSchema,
      debug: t.boolean,
      filter: t.unknown,
      page_size: t.number,
      weights: riskWeightsSchema,
    }),
  ])
);
