/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class EndpointAppConstants {
  static ENDPOINT_INDEX_NAME = 'endpoint-agent*';
}

export interface EndpointResultList {
  // the endpoint restricted by the page size
  endpoints: EndpointMetadata[];
  // the total number of unique endpoints in the index
  total: number;
  // the page size requested
  request_page_size: number;
  // the index requested
  request_page_index: number;
}

export interface EndpointMetadata {
  event: {
    created: Date;
  };
  endpoint: {
    policy: {
      id: string;
    };
  };
  agent: {
    version: string;
    id: string;
  };
  host: {
    id: string;
    hostname: string;
    ip: string[];
    mac: string[];
    os: {
      name: string;
      full: string;
      version: string;
    };
  };
}
