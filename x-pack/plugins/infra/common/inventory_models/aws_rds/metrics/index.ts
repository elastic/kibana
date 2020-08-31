/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InventoryMetrics } from '../../types';

import { cpu } from './snapshot/cpu';
import { rdsLatency } from './snapshot/rds_latency';
import { rdsConnections } from './snapshot/rds_connections';
import { rdsQueriesExecuted } from './snapshot/rds_queries_executed';
import { rdsActiveTransactions } from './snapshot/rds_active_transactions';

import { awsRDSLatency } from './tsvb/aws_rds_latency';
import { awsRDSConnections } from './tsvb/aws_rds_connections';
import { awsRDSCpuTotal } from './tsvb/aws_rds_cpu_total';
import { awsRDSQueriesExecuted } from './tsvb/aws_rds_queries_executed';
import { awsRDSActiveTransactions } from './tsvb/aws_rds_active_transactions';

export const metrics: InventoryMetrics = {
  tsvb: {
    awsRDSLatency,
    awsRDSConnections,
    awsRDSCpuTotal,
    awsRDSQueriesExecuted,
    awsRDSActiveTransactions,
  },
  snapshot: {
    cpu,
    rdsLatency,
    rdsConnections,
    rdsQueriesExecuted,
    rdsActiveTransactions,
  },
  defaultSnapshot: 'cpu',
  defaultTimeRangeInSeconds: 14400, // 4 hours
};
