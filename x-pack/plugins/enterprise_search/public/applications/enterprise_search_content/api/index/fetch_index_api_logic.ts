/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface KeyValuePair {
  label: string;
  value: string;
}

export type ConnectorConfiguration = Record<string, KeyValuePair | undefined>;
export interface ConnectorScheduling {
  enabled: boolean;
  interval: string;
}

export interface Connector {
  api_key_id: string | null;
  configuration: ConnectorConfiguration;
  created_at: string | null;
  id: string;
  index_name: string;
  last_seen: string | null;
  last_synced: string | null;
  scheduling: {
    enabled: boolean;
    interval: string; // crontab syntax
  };
  service_type: string | null;
  status: string;
  sync_error: string | null;
  sync_now: boolean;
  sync_status: string | null;
}

export interface Crawler {
  domains: [];
}

export interface IndexData {
  connector?: Connector;
  crawler?: Crawler;
  index: {
    aliases: string[];
    health: string;
    name: string;
    total: {
      docs: {
        count: number;
        deleted: number;
      };
    };
    uuid: string;
  };
}

export const fetchIndex = async ({ indexName }: { indexName: string }) => {
  const route = `/internal/enterprise_search/indices/${indexName}`;

  return await HttpLogic.values.http.get<IndexData>(route);
};

export const FetchIndexApiLogic = createApiLogic(['fetch_index_api_logic'], fetchIndex);
