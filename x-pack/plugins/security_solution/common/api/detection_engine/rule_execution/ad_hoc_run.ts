/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { RuleActionArrayCamel } from '@kbn/securitysolution-io-ts-alerting-types';

import { RuleObjectId } from '../model';

export type AdHocRunSchema = t.TypeOf<typeof adHocRunSchema>;
export const adHocRunSchema = t.exact(
  t.intersection([
    t.type({
      id: RuleObjectId,
      from: t.string,
      to: t.string,
      maxSignals: t.number,
    }),
    t.partial({
      actions: RuleActionArrayCamel,
    }),
  ])
);

export interface AdHocRunResponse {
  id: string | undefined;
}
