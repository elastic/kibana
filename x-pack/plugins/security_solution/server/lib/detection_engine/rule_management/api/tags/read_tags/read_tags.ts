/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import { enrichFilterWithRuleTypeMapping } from '../../../logic/search/enrich_filter_with_rule_type_mappings';

// This is a contrived max limit on the number of tags. In fact it can exceed this number and will be truncated to the hardcoded number.
const EXPECTED_MAX_TAGS = 65536;

export const readTags = async ({
  rulesClient,
}: {
  rulesClient: RulesClient;
  perPage?: number;
}): Promise<string[]> => {
  const res = await rulesClient.aggregate({
    options: {
      fields: ['tags'],
      filter: enrichFilterWithRuleTypeMapping(undefined),
      maxTags: EXPECTED_MAX_TAGS,
    },
  });

  return res.ruleTags ?? [];
};
