/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ECS {
  _id: string;
  '@timestamp': string;
  // TODO: The rest of these fields
  event: {
    id: string;
    category: string;
    type: string;
    module: string;
    severity: number;
    // TODO: The rest of these fields
  };
  source: {
    ip: string;
    hostname: string;
    // TODO: The rest of these fields
  };
  user: {
    id: string;
    name: string;
    // TODO: The rest of these fields
  };
}
