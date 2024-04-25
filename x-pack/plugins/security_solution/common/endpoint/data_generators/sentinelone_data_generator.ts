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
  SentinelOneActivityDataForType80,
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
  generateActivityEsDoc<TData>(
    overrides: DeepPartial<SentinelOneActivityEsDoc> = {}
  ): SentinelOneActivityEsDoc<TData> {
    const doc: SentinelOneActivityEsDoc = {
      sentinel_one: {
        activity: {
          data: {},
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

    return merge(doc, overrides) as SentinelOneActivityEsDoc<TData>;
  }

  generateActivityEsSearchHit<TData>(
    overrides: DeepPartial<SentinelOneActivityEsDoc<TData>> = {}
  ): SearchHit<SentinelOneActivityEsDoc<TData>> {
    const hit = this.toEsSearchHit<SentinelOneActivityEsDoc<TData>>(
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

  generateActivityEsSearchResponse<TData>(
    docs: Array<SearchHit<SentinelOneActivityEsDoc<TData>>> = [this.generateActivityEsSearchHit()]
  ): SearchResponse<SentinelOneActivityEsDoc<TData>> {
    return this.toEsSearchResponse<SentinelOneActivityEsDoc<TData>>(docs);
  }

  generateActivityFetchFileResponseData(
    overrides: DeepPartial<SentinelOneActivityDataForType80> = {}
  ): SentinelOneActivityDataForType80 {
    const data: SentinelOneActivityDataForType80 = {
      flattened: {
        commandId: Number([...this.randomNGenerator(1000, 2)].join('')),
        commandBatchUuid: this.seededUUIDv4(),
        filename: 'file.zip',
        sourceType: 'API',
        uploadedFilename: 'file_fetch.zip',
      },
      site: { name: 'Default site' },
      group_name: 'Default Group',
      scope: { level: 'Group', name: 'Default Group' },
      fullscope: {
        details: 'Group Default Group in Site Default site of Account Foo',
        details_path: 'Global / Foo / Default site / Default Group',
      },
      downloaded: {
        url: `/agents/${[...this.randomNGenerator(100, 4)].join('')}/uploads/${[
          ...this.randomNGenerator(100, 4),
        ].join('')}`,
      },
      account: { name: 'Foo' },
    };

    return merge(data, overrides);
  }
}
