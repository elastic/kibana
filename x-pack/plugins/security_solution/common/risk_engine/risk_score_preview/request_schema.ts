/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { NumberBetweenZeroAndOneInclusive } from '@kbn/securitysolution-io-ts-types';
import { DataViewId } from '../../detection_engine/rule_schema';

const afterKey = t.record(t.string, t.string);

export type RiskScorePreviewRequestSchema = t.TypeOf<typeof riskScorePreviewRequestSchema>;
export const riskScorePreviewRequestSchema = t.exact(
  t.partial({
    after_keys: t.partial({
      host: afterKey,
      user: afterKey,
    }),
    data_view_id: DataViewId,
    debug: t.boolean,
    filter: t.unknown,
    page_size: t.number,
    identifier_type: t.keyof({ user: null, host: null }),
    range: t.type({
      start: t.string,
      end: t.string,
    }),
    weights: t.array(
      t.intersection([
        t.partial({
          value: t.string,
          host: NumberBetweenZeroAndOneInclusive,
          user: NumberBetweenZeroAndOneInclusive,
        }),
        t.exact(
          t.type({
            type: t.string,
          })
        ),
      ])
    ),
  })
);
