/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type SearchHitsMetadata,
  type SearchResponseBody,
} from '@elastic/elasticsearch/lib/api/types';

export interface RawSentinelOneInfo {
  sentinel_one: {
    agent: {
      uuid: string;
      last_active_date: string;
      network_status: string;
      is_active: boolean;
      is_pending_uninstall: boolean;
      is_uninstalled: boolean;
    };
  };
}

export type SentinelOneSearchResponse = SearchResponseBody & {
  hits: SearchResponseBody['hits'] & {
    hits: Array<SearchResponseBody['hits']['hits']> & {
      inner_hits: {
        most_recent: {
          hits: SearchHitsMetadata<RawSentinelOneInfo>;
        };
      };
    };
  };
};
