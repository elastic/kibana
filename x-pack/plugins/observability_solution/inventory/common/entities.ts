/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface LatestEntity {
  agent: {
    name: string[];
  };
  data_stream: {
    type: string[];
  };
  cloud: {
    availability_zone: string[];
  };
  entity: {
    firstSeenTimestamp: string;
    lastSeenTimestamp: string;
    type: string;
    displayName: string;
    id: string;
    identityFields: string[];
  };
}
