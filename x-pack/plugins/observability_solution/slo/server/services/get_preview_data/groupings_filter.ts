/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { ALL_VALUE } from '@kbn/slo-schema';
import { Options } from './get_preview_data';

export function getGroupingsFilter(options: Options): estypes.QueryDslQueryContainer[] | undefined {
  const groupingsKeys = Object.keys(options.groupings ?? {});
  if (groupingsKeys.length) {
    return groupingsKeys.map((key) => ({
      term: { [key]: options.groupings![key] },
    }));
  } else if (options.instanceId !== ALL_VALUE && options.groupBy) {
    return [
      {
        term: { [options.groupBy]: options.instanceId },
      },
    ];
  }
}
