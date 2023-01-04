/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import { enrichFilterWithRuleTypeMapping } from '../../../logic/search/enrich_filter_with_rule_type_mappings';

interface RuleAggregations {
  tags: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
}

const EXPECTED_MAX_TAGS = 65536;

export async function readTags(client: RulesClient): Promise<string[]> {
  const aggregations = await client.aggregate<RuleAggregations>(
    {
      tags: {
        terms: { field: 'alert.attributes.tags', order: { _key: 'asc' }, size: EXPECTED_MAX_TAGS },
      },
    },
    {
      options: {
        filter: enrichFilterWithRuleTypeMapping(undefined),
      },
    }
  );

  if (!aggregations) {
    return [];
  }

  return aggregations.tags.buckets.map((x) => x.key);
}
