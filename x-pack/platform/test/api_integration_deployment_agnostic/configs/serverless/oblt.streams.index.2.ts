/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Serverless Observability - Deployment-agnostic Streams API integration tests', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('../../apis/streams/significant_events'));
    loadTestFile(require.resolve('../../apis/streams/queries'));
    loadTestFile(require.resolve('../../apis/streams/discover'));
    loadTestFile(require.resolve('../../apis/streams/content'));
    loadTestFile(require.resolve('../../apis/streams/migration_on_read'));
    loadTestFile(require.resolve('../../apis/streams/metadata'));
    loadTestFile(require.resolve('../../apis/streams/conflicts'));
    loadTestFile(require.resolve('../../apis/streams/field_mappings'));
    loadTestFile(require.resolve('../../apis/streams/permissions'));
    loadTestFile(require.resolve('../../apis/streams/global_search'));
    loadTestFile(require.resolve('../../apis/streams/settings'));
    loadTestFile(require.resolve('../../apis/streams/doc_counts'));
    loadTestFile(require.resolve('../../apis/streams/snapshot_restore'));
    loadTestFile(require.resolve('../../apis/streams/query_streams'));
  });
}
