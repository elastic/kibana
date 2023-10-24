/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RewriteResponseCase } from '@kbn/actions-plugin/common';
import type { RuleTagsFormattedResponse } from '../../../../../../../common/routes/rule/apis/tags';

export const transformRuleTagsBodyResponse: RewriteResponseCase<RuleTagsFormattedResponse> = ({
  perPage,
  total,
  page,
  data,
}) => ({
  total,
  page,
  data,
  per_page: perPage,
});
