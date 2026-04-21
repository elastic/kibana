/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GcsConfig } from './types';

export const GCS_BUCKET = 'obs-ai-datasets';

export const PAYMENT_SERVICE_GCS: GcsConfig = {
  bucket: GCS_BUCKET,
  basePath: 'otel-demo/payment-service-failures',
};
