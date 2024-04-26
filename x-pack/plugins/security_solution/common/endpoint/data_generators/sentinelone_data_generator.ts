/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeepPartial } from 'utility-types';
import { merge } from 'lodash';
import type { SearchResponse, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { EndpointActionGenerator } from './endpoint_action_generator';
import { SENTINEL_ONE_ACTIVITY_INDEX } from '../..';
import type {
  LogsEndpointAction,
  SentinelOneActivityEsDoc,
  EndpointActionDataParameterTypes,
  EndpointActionResponseDataOutput,
} from '../types';

export class SentinelOneDataGenerator extends EndpointActionGenerator {
  generate<
    TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes,
    TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
    TMeta extends {} = {}
  >(
    overrides: DeepPartial<LogsEndpointAction<TParameters, TOutputContent, TMeta>> = {}
  ): LogsEndpointAction<TParameters, TOutputContent, TMeta> {
    return super.generate({
      EndpointActions: {
        input_type: 'sentinel_one',
      },
      ...overrides,
    }) as LogsEndpointAction<TParameters, TOutputContent, TMeta>;
  }

  /** Generate a SentinelOne activity index ES doc */
  generateActivityEsDoc(
    overrides: DeepPartial<SentinelOneActivityEsDoc> = {}
  ): SentinelOneActivityEsDoc {
    const doc: SentinelOneActivityEsDoc = {
      sentinel_one: {
        activity: {
          agent: {
            id: this.seededUUIDv4(),
          },
          updated_at: '2024-03-29T13:45:21.723Z',
          description: {
            primary: 'Some description here',
          },
          id: this.seededUUIDv4(),
          type: 1001,
        },
      },
    };

    return merge(doc, overrides);
  }

  generateActivityEsSearchHit(
    overrides: DeepPartial<SentinelOneActivityEsDoc> = {}
  ): SearchHit<SentinelOneActivityEsDoc> {
    const hit = this.toEsSearchHit<SentinelOneActivityEsDoc>(
      this.generateActivityEsDoc(overrides),
      SENTINEL_ONE_ACTIVITY_INDEX
    );

    hit.inner_hits = {
      first_found: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        hits: { hits: [this.toEsSearchHit(hit._source!, hit._index)] },
      },
    };

    return hit;
  }

  generateActivityEsSearchResponse(
    docs: Array<SearchHit<SentinelOneActivityEsDoc>> = [this.generateActivityEsSearchHit()]
  ): SearchResponse<SentinelOneActivityEsDoc> {
    return this.toEsSearchResponse<SentinelOneActivityEsDoc>(docs);
  }
}
