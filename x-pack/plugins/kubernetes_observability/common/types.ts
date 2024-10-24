/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License
* 2.0; you may not use this file except in compliance with the Elastic License
* 2.0.
*/


interface WithTimestamp {
    '@timestamp': string;
  }


export type CloudProviderName = 'aws' | 'gcp' | 'azure' | 'other' | 'unknown' | 'none';

export interface K8sPod extends WithTimestamp {
    id: string;
    name?: string;
    ean: string;
    node?: string;
    cloud?: {
      provider?: CloudProviderName;
      region?: string;
    };
  }