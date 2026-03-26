/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';

export default function alertingTests({ loadTestFile }: FtrProviderContext) {
  describe('builtin alertTypes', () => {
    loadTestFile(require.resolve('./index_threshold'));
    loadTestFile(require.resolve('./es_query'));
    loadTestFile(require.resolve('./disabled_rule_types'));
  });
}
