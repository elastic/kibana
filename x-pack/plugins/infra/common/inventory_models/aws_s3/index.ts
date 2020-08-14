/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { metrics } from './metrics';
import { InventoryModel } from '../types';

export const awsS3: InventoryModel = {
  id: 'awsS3',
  displayName: i18n.translate('xpack.infra.inventoryModels.awsS3.displayName', {
    defaultMessage: 'S3 Buckets',
  }),
  singularDisplayName: i18n.translate('xpack.infra.inventoryModels.awsS3.singularDisplayName', {
    defaultMessage: 'S3 Bucket',
  }),
  requiredModule: 'aws',
  crosslinkSupport: {
    details: true,
    logs: true,
    apm: false,
    uptime: false,
  },
  metrics,
  fields: {
    id: 'aws.s3.bucket.name',
    name: 'aws.s3.bucket.name',
  },
  requiredMetrics: [
    'awsS3BucketSize',
    'awsS3NumberOfObjects',
    'awsS3TotalRequests',
    'awsS3DownloadBytes',
    'awsS3UploadBytes',
  ],
  tooltipMetrics: [
    's3BucketSize',
    's3NumberOfObjects',
    's3TotalRequests',
    's3UploadBytes',
    's3DownloadBytes',
  ],
};
