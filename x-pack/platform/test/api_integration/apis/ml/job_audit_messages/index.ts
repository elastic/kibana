/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlJob } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('job_audit_messages', function () {
    loadTestFile(require.resolve('./get_job_audit_messages'));
    loadTestFile(require.resolve('./clear_messages'));
  });
}

export const getJobConfig = (numOfJobs: number) => {
  return new Array(numOfJobs).fill(null).map(
    (v, i) =>
      ({
        job_id: `test_get_job_audit_messages_${i + 1}`,
        description: 'job_audit_messages',
        groups: ['farequote', 'automated', 'single-metric'],
        analysis_config: {
          bucket_span: '15m',
          influencers: [],
          detectors: [
            {
              function: 'mean',
              field_name: 'responsetime',
            },
            {
              function: 'min',
              field_name: 'responsetime',
            },
          ],
        },
        data_description: { time_field: '@timestamp' },
        analysis_limits: { model_memory_limit: '10mb' },
      } as unknown as MlJob)
  );
};
