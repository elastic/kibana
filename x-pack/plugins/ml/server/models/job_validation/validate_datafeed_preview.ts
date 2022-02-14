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
import type { DatafeedValidationResponse } from '../../../common/types/job_validation';

export async function validateDatafeedPreviewWithMessages(
  mlClient: MlClient,
  authHeader: AuthorizationHeader,
  job: CombinedJob
): Promise<JobValidationMessage[]> {
  const { valid, documentsFound } = await validateDatafeedPreview(mlClient, authHeader, job);
  if (valid) {
    return documentsFound ? [] : [{ id: 'datafeed_preview_no_documents' }];
  }
  return [{ id: 'datafeed_preview_failed' }];
}

export async function validateDatafeedPreview(
  mlClient: MlClient,
  authHeader: AuthorizationHeader,
  job: CombinedJob
): Promise<DatafeedValidationResponse> {
  const { datafeed_config: datafeed, ...tempJob } = job;
  try {
    const body = (await mlClient.previewDatafeed(
      {
        body: {
          job_config: tempJob,
          datafeed_config: datafeed,
        },
      },
      authHeader
      // previewDatafeed response type is incorrect
    )) as unknown as { body: unknown[] };

    return {
      valid: true,
      documentsFound: Array.isArray(body) && body.length > 0,
    };
  } catch (error) {
    return {
      valid: false,
      documentsFound: false,
      error: error.body ?? error,
    };
  }
}
