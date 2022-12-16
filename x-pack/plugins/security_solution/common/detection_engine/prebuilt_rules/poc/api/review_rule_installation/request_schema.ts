/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { PrebuiltRuleContentDataModel } from '../get_prebuilt_rules_status/request_schema';

export type ReviewRuleInstallationRequestBody = t.TypeOf<typeof ReviewRuleInstallationRequestBody>;
export const ReviewRuleInstallationRequestBody = t.exact(
  t.type({
    data_model: PrebuiltRuleContentDataModel,
  })
);
