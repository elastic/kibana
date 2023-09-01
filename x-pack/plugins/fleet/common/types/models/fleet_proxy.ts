/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface BaseFleetProxy {
  name: string;
  url: string;
  certificate_authorities?: string | null;
  certificate?: string | null;
  certificate_key?: string | null;
  is_preconfigured: boolean;
}

// SO definition for this type is declared in server/types/interfaces
export interface NewFleetProxy extends BaseFleetProxy {
  proxy_headers?: Record<string, string | number | boolean> | null;
}

export interface FleetProxy extends NewFleetProxy {
  id: string;
}
