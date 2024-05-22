/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RawCrowdstrikeInfo {
  crowdstrike: {
    host: {
      id: string;
      last_seen: string;
      hostname: string;
      status: string;
    };
    reduced_functionality_mode: 'no'; // or else?
    status: string;
  };
  cid: string;
  device: {
    id: string;
  };
}
