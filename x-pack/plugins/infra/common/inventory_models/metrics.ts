/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { metrics as hostMetrics } from './host/metrics';
import { metrics as sharedMetrics } from './shared/metrics';
import { metrics as podMetrics } from './pod/metrics';
import { metrics as containerMetrics } from './container/metrics';
import { metrics as awsEC2Metrics } from './aws_ec2/metrics';
import { metrics as awsS3Metrics } from './aws_s3/metrics';
import { metrics as awsRDSMetrics } from './aws_rds/metrics';
import { metrics as awsSQSMetrics } from './aws_sqs/metrics';

export const metrics = {
  tsvb: {
    ...hostMetrics.tsvb,
    ...sharedMetrics.tsvb,
    ...podMetrics.tsvb,
    ...containerMetrics.tsvb,
    ...awsEC2Metrics.tsvb,
    ...awsS3Metrics.tsvb,
    ...awsRDSMetrics.tsvb,
    ...awsSQSMetrics.tsvb,
  },
};
