/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InventoryMetrics } from '../../types';

import { awsS3BucketSize } from './tsvb/aws_s3_bucket_size';
import { awsS3TotalRequests } from './tsvb/aws_s3_total_requests';
import { awsS3NumberOfObjects } from './tsvb/aws_s3_number_of_objects';
import { awsS3DownloadBytes } from './tsvb/aws_s3_download_bytes';
import { awsS3UploadBytes } from './tsvb/aws_s3_upload_bytes';

import { s3BucketSize } from './snapshot/s3_bucket_size';
import { s3TotalRequests } from './snapshot/s3_total_requests';
import { s3NumberOfObjects } from './snapshot/s3_number_of_objects';
import { s3DownloadBytes } from './snapshot/s3_download_bytes';
import { s3UploadBytes } from './snapshot/s3_upload_bytes';

export const metrics: InventoryMetrics = {
  tsvb: {
    awsS3BucketSize,
    awsS3TotalRequests,
    awsS3NumberOfObjects,
    awsS3DownloadBytes,
    awsS3UploadBytes,
  },
  snapshot: {
    s3BucketSize,
    s3NumberOfObjects,
    s3TotalRequests,
    s3UploadBytes,
    s3DownloadBytes,
  },
  defaultSnapshot: 's3BucketSize',
  defaultTimeRangeInSeconds: 86400 * 7, // 7 days
};
