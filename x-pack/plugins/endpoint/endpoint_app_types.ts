/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface AlertData {
  value: {
    source: {
      endgame: {
        data: {
          file_operation: string;
          malware_classification: {
            score: number;
          };
        };
        metadata: {
          key: string;
        };
        timestamp_utc: Date;
      };
      labels: {
        endpoint_id: string;
      };
      host: {
        hostname: string;
        ip: string;
        os: {
          name: string; // TODO Union types?
        };
      };
    };
  };
}
