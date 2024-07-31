/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonValue } from '@kbn/utility-types';
import type { ResolverSchema } from '../../../../../../common/endpoint/types';
import { createSharedFilters } from '../../utils/shared_filters';
import type { TimeRange } from '../utils';
import { resolverFields } from '../utils';

export interface ResolverQueryParams {
  readonly schema?: ResolverSchema;
  readonly agentId?: string;
  readonly indexPatterns: string | string[];
  readonly isInternalRequest?: boolean;
  readonly shouldExcludeColdAndFrozenTiers?: boolean;
  readonly timeRange: TimeRange | undefined;
  readonly resolverFields?: JsonValue[];
  getRangeFilter?: () => Array<{
    range: { '@timestamp': { gte: string; lte: string; format: string } };
  }>;
}

export class BaseResolverQuery implements ResolverQueryParams {
  readonly schema: ResolverSchema;
  readonly agentId: string | undefined;
  readonly indexPatterns: string | string[];
  readonly isInternalRequest?: boolean;
  readonly shouldExcludeColdAndFrozenTiers?: boolean;
  readonly timeRange: TimeRange | undefined;
  readonly resolverFields?: JsonValue[];

  constructor({
    schema,
    indexPatterns,
    timeRange,
    isInternalRequest,
    shouldExcludeColdAndFrozenTiers,
    agentId,
  }: ResolverQueryParams) {
    const schemaOrDefault = schema
      ? schema
      : {
          id: 'process.entity_id',
          parent: 'process.parent.entity_id',
        };
    this.resolverFields = resolverFields(schemaOrDefault);
    this.schema = schemaOrDefault;
    this.indexPatterns = indexPatterns;
    this.timeRange = timeRange;
    this.isInternalRequest = isInternalRequest;
    this.shouldExcludeColdAndFrozenTiers = shouldExcludeColdAndFrozenTiers;
    this.agentId = agentId;
  }

  getColdAndFrozenTierFilter() {
    return createSharedFilters({
      excludeColdAndFrozenTiers: !!this.shouldExcludeColdAndFrozenTiers,
    });
  }

  getRangeFilter() {
    return this.timeRange
      ? [
          {
            range: {
              '@timestamp': {
                gte: this.timeRange.from,
                lte: this.timeRange.to,
                format: 'strict_date_optional_time',
              },
            },
          },
        ]
      : [];
  }
}
