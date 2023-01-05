/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetServerHost } from '../models';

import type { ListResult } from './common';

export type GetFleetServerHostsResponse = ListResult<FleetServerHost>;

export interface PutFleetServerHostsRequest {
  params: {
    itemId: string;
  };
  body: {
    name?: string;
    host_urls?: string[];
    is_default?: boolean;
    proxy_id?: string | null;
  };
}

export interface PostFleetServerHostsRequest {
  body: {
    id?: string;
    name?: string;
    host_urls?: string[];
    is_default?: boolean;
    proxy_id?: string | null;
  };
}

export interface PostFleetServerHostsResponse {
  item: FleetServerHost;
}
