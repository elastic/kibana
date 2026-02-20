/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Streams Endpoints', () => {
    loadTestFile(require.resolve('./stream_management/basic'));
    loadTestFile(require.resolve('./stream_management/enrichment'));
    loadTestFile(require.resolve('./stream_management/classic'));
    loadTestFile(require.resolve('./stream_management/flush_config'));
    loadTestFile(require.resolve('./stream_management/attachments'));
    loadTestFile(require.resolve('./stream_management/schema'));
    loadTestFile(require.resolve('./stream_management/processing_date_suggestions'));
    loadTestFile(require.resolve('./stream_management/processing_simulate'));
    loadTestFile(require.resolve('./stream_management/processing_validation'));
    loadTestFile(require.resolve('./stream_management/root_stream'));
    loadTestFile(require.resolve('./stream_management/lifecycle'));
    loadTestFile(require.resolve('./stream_management/failure_store'));
    loadTestFile(require.resolve('./stream_management/discover'));
    loadTestFile(require.resolve('./stream_management/content'));
    loadTestFile(require.resolve('./stream_management/migration_on_read'));
    loadTestFile(require.resolve('./stream_management/metadata'));
    loadTestFile(require.resolve('./stream_management/conflicts'));
    loadTestFile(require.resolve('./stream_management/field_mappings'));
    loadTestFile(require.resolve('./stream_management/permissions'));
    loadTestFile(require.resolve('./stream_management/global_search'));
    loadTestFile(require.resolve('./stream_management/settings'));
    loadTestFile(require.resolve('./stream_management/doc_counts'));
    loadTestFile(require.resolve('./stream_management/snapshot_restore'));

    loadTestFile(require.resolve('./sig_events/systems'));
    loadTestFile(require.resolve('./sig_events/significant_events'));
    loadTestFile(require.resolve('./sig_events/queries'));
  });
}
