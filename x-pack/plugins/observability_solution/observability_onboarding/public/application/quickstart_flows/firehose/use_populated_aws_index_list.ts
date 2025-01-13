/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '../../../hooks/use_fetcher';
import {
  FIREHOSE_CLOUDFORMATION_STACK_NAME,
  FIREHOSE_LOGS_STREAM_NAME,
} from '../../../../common/aws_firehose';

export function usePopulatedAWSIndexList() {
  return useFetcher((callApi) => {
    return callApi('GET /internal/observability_onboarding/firehose/has-data', {
      params: {
        query: {
          logsStreamName: FIREHOSE_LOGS_STREAM_NAME,
          stackName: FIREHOSE_CLOUDFORMATION_STACK_NAME,
        },
      },
    });
  }, []);
}
