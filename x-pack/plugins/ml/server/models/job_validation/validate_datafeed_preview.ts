/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlClient } from '../../lib/ml_client';
import type { AuthorizationHeader } from '../../lib/request_authorization';
import type { CombinedJob } from '../../../common/types/anomaly_detection_jobs';
import type { JobValidationMessage } from '../../../common/constants/messages';

export async function validateDatafeedPreview(
  mlClient: MlClient,
  authHeader: AuthorizationHeader,
  job: CombinedJob
): Promise<JobValidationMessage[]> {
  const { datafeed_config: datafeed, ...tempJob } = job;
  try {
    const { body } = ((await mlClient.previewDatafeed(
      {
        body: {
          job_config: tempJob,
          datafeed_config: datafeed,
        },
      },
      authHeader
      // previewDatafeed response type is incorrect
    )) as unknown) as { body: unknown[] };

    if (Array.isArray(body) === false || body.length === 0) {
      return [{ id: 'datafeed_preview_no_documents' }];
    }
    return [];
  } catch (error) {
    return [{ id: 'datafeed_preview_failed' }];
  }
}
