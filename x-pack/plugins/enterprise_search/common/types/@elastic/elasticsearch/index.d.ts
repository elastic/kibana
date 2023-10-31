/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@elastic/elasticsearch/lib/api/types';

// TODO: Remove once type fixed in elasticsearch-specification
// (add github issue)
declare module '@elastic/elasticsearch/lib/api/types' {
  // This workaround adds copy_from and description to the original IngestSetProcess and makes value
  // optional. It should be value xor copy_from, but that requires using type unions. This
  // workaround requires interface merging (ie, not types), so we cannot get.
  export interface IngestSetProcessor {
    copy_from?: string;
    description?: string;
  }
  export interface SecurityRoleDescriptor {
    restriction?: SecurityWorkflow;
  }
  export interface SecurityWorkflow {
    workflows: string[];
  }
}
