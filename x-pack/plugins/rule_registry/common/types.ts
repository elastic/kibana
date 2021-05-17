/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';

export type PutIndexTemplateRequest = estypes.PutIndexTemplateRequest & {
  body?: { composed_of?: string[] };
};

export interface ClusterPutComponentTemplateBody {
  template: {
    settings: {
      number_of_shards: number;
    };
    mappings: estypes.TypeMapping;
  };
}
