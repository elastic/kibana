/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface NewFleetProxy {
  name: string;
  url: string;
  proxy_headers?: string;
  certificate_authorities?: string;
  certificate?: string;
  certificate_key?: string;
  is_preconfigured: boolean;
}

export interface FleetProxy extends NewFleetProxy {
  id: string;
}

export type FleetProxySOAttributes = NewFleetProxy;
