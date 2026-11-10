/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FailedCallBucket } from '@kbn/apm-api-shared';

/** Where a failed call failed, with a short hint that explains the category. */
export function getBucketLabel({
  type,
  sourceLabel,
  targetLabel,
}: {
  type: FailedCallBucket['type'];
  sourceLabel: string;
  targetLabel: string;
}): { primary: string; hint: string } {
  switch (type) {
    case 'caller':
      return {
        primary: i18n.translate('xpack.apm.requestFlyout.failedCalls.bucket.caller.label', {
          defaultMessage: '{source} (never reached {target})',
          values: { source: sourceLabel, target: targetLabel },
        }),
        hint: i18n.translate('xpack.apm.requestFlyout.failedCalls.bucket.caller.hint', {
          defaultMessage: 'timeout / connection error',
        }),
      };
    case 'server':
      return {
        primary: i18n.translate('xpack.apm.requestFlyout.failedCalls.bucket.server.label', {
          defaultMessage: '{target} (server error)',
          values: { target: targetLabel },
        }),
        hint: i18n.translate('xpack.apm.requestFlyout.failedCalls.bucket.server.hint', {
          defaultMessage: '5xx / gRPC INTERNAL / UNAVAILABLE',
        }),
      };
    case 'client':
      return {
        primary: i18n.translate('xpack.apm.requestFlyout.failedCalls.bucket.client.label', {
          defaultMessage: 'Client errors',
        }),
        hint: i18n.translate('xpack.apm.requestFlyout.failedCalls.bucket.client.hint', {
          defaultMessage: '4xx / INVALID_ARGUMENT',
        }),
      };
    case 'dependency':
      return {
        primary: i18n.translate('xpack.apm.requestFlyout.failedCalls.bucket.dependency.label', {
          defaultMessage: 'Call to {target} failed',
          values: { target: targetLabel },
        }),
        hint: '',
      };
  }
}
