/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// FIXME: temporary until server defined `interface` is moved
export interface EndpointData {
  machine_id: string;
  created_at: Date;
  host: {
    name: string;
    hostname: string;
    ip: string;
    mac_address: string;
    os: {
      name: string;
      full: string;
    };
  };
  endpoint: {
    domain: string;
    is_base_image: boolean;
    active_directory_distinguished_name: string;
    active_directory_hostname: string;
    upgrade: {
      status?: string;
      updated_at?: Date;
    };
    isolation: {
      status: boolean;
      request_status?: string | boolean;
      updated_at?: Date;
    };
    policy: {
      name: string;
      id: string;
    };
    sensor: {
      persistence: boolean;
      status: object;
    };
  };
}

// FIXME: temporary until server defined `interface` is moved to a module we can reference
export interface EndpointListData {
  endpoints: EndpointData[];
  request_page_size: number;
  request_page_index: number;
  total: number;
}

export type EndpointListState = EndpointListData;

export interface EndpointListPagination {
  pageIndex: number;
  pageSize: number;
}
