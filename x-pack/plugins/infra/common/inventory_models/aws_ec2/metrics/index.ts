/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cpu } from './snapshot/cpu';
import { rx } from './snapshot/rx';
import { tx } from './snapshot/tx';
import { diskIOReadBytes } from './snapshot/disk_io_read_bytes';
import { diskIOWriteBytes } from './snapshot/disk_io_write_bytes';

import { awsEC2CpuUtilization } from './tsvb/aws_ec2_cpu_utilization';
import { awsEC2NetworkTraffic } from './tsvb/aws_ec2_network_traffic';
import { awsEC2DiskIOBytes } from './tsvb/aws_ec2_diskio_bytes';

import { InventoryMetrics } from '../../types';

export const metrics: InventoryMetrics = {
  tsvb: {
    awsEC2CpuUtilization,
    awsEC2NetworkTraffic,
    awsEC2DiskIOBytes,
  },
  snapshot: { cpu, rx, tx, diskIOReadBytes, diskIOWriteBytes },
  defaultSnapshot: 'cpu',
  defaultTimeRangeInSeconds: 14400, // 4 hours
};
