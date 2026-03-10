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

    loadTestFile(require.resolve('../../apis/streams/basic'));
    loadTestFile(require.resolve('../../apis/streams/enrichment'));
    loadTestFile(require.resolve('../../apis/streams/classic'));
    loadTestFile(require.resolve('../../apis/streams/flush_config'));
    loadTestFile(require.resolve('../../apis/streams/attachments/attachments'));
    loadTestFile(require.resolve('../../apis/streams/schema'));
    loadTestFile(require.resolve('../../apis/streams/processing_date_suggestions'));
    loadTestFile(require.resolve('../../apis/streams/processing_simulate'));
    loadTestFile(require.resolve('../../apis/streams/processing_validation'));
    loadTestFile(require.resolve('../../apis/streams/root_stream'));
    loadTestFile(require.resolve('../../apis/streams/lifecycle'));
    loadTestFile(require.resolve('../../apis/streams/failure_store'));
    loadTestFile(require.resolve('../../apis/streams/ingest_missing_data_stream'));
  });
}
