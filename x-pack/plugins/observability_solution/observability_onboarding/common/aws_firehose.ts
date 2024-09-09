/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const FIREHOSE_CLOUDFORMATION_STACK_NAME = 'Elastic-CloudwatchLogsAndMetricsToFirehose';
export const FIREHOSE_LOGS_STREAM_NAME = 'Elastic-CloudwatchLogs';
export const FIREHOSE_METRICS_STREAM_NAME = 'Elastic-CloudwatchMetrics';

export const FIREHOSE_CLOUDFORMATION_TEMPLATE_URL =
  'https://elastic-cloudformation-templates.s3.amazonaws.com/v0.1.0/firehose_default_start.yml';

export const AWS_INDEX_NAME_LIST = [
  // Logs
  'logs-aws.vpcflow',
  'logs-aws.apigateway_logs',
  'logs-aws.cloudtrail',
  'logs-aws.firewall_logs',
  'logs-aws.route53_public_logs',
  'logs-aws.route53_resolver_logs',
  'logs-aws.waf',
  'logs-awsfirehose',
  // Metrics
  'metrics-aws.apigateway_metrics',
  'metrics-aws.dynamodb',
  'metrics-aws.ebs',
  'metrics-aws.ec2_metrics',
  'metrics-aws.ecs_metrics',
  'metrics-aws.elb_metrics',
  'metrics-aws.emr_metrics',
  'metrics-aws.firewall_metrics',
  'metrics-aws.kafka_metrics',
  'metrics-aws.kinesis',
  'metrics-aws.lambda',
  'metrics-aws.natgateway',
  'metrics-aws.rds',
  'metrics-aws.s3_storage_lens',
  'metrics-aws.s3_daily_storage',
  'metrics-aws.s3_request',
  'metrics-aws.sns',
  'metrics-aws.sqs',
  'metrics-aws.transitgateway',
  'metrics-aws.usage',
  'metrics-aws.vpn',
] as const;

export type AWSIndexName = (typeof AWS_INDEX_NAME_LIST)[number];
