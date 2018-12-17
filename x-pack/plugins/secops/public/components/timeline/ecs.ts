/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * A runtime representation of the Elastic Common Schema (ECS) https://github.com/elastic/ecs
 *
 * It is NOT a 1:1 mapping to the ECS:
 * + It INCLUDES "virtual (non-spec)" fields that are not defined by ECS (e.g. `_id`)
 * + It INCLUDES "mapped" fields (e.g. `@timestamp` in ECS is named `timestamp` here)
 */
export interface ECS {
  _id: string;
  timestamp: string;
  host: {
    hostname?: string;
    ip?: string;
  };
  event: {
    id?: string;
    category?: string;
    type?: string;
    module?: string;
    severity?: number;
  };
  suricata?: {
    eve?: {
      flow_id?: number;
      proto?: string;
      alert?: {
        signature: string;
        signature_id: number;
      };
    };
  };
  source: {
    ip?: string;
    port?: number;
  };
  destination: {
    ip?: string;
    port?: number;
  };
  geo: {
    region_name?: string;
    country_iso_code?: string;
  };
  user?: {
    id: string;
    name: string;
  };
  [key: string]: string | object | undefined;
}
