/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { PositiveInteger } from '@kbn/securitysolution-io-ts-types';

export type GetPrebuiltRulesAndTimelinesStatusResponse = t.TypeOf<
  typeof GetPrebuiltRulesAndTimelinesStatusResponse
>;
export const GetPrebuiltRulesAndTimelinesStatusResponse = t.exact(
  t.type({
    rules_custom_installed: PositiveInteger,
    rules_installed: PositiveInteger,
    rules_not_installed: PositiveInteger,
    rules_not_updated: PositiveInteger,

    timelines_installed: PositiveInteger,
    timelines_not_installed: PositiveInteger,
    timelines_not_updated: PositiveInteger,
  })
);
