/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export enum NetworkTopTablesFields {
  bytes_in = 'bytes_in',
  bytes_out = 'bytes_out',
  flows = 'flows',
  destination_ips = 'destination_ips',
  source_ips = 'source_ips',
}

export const topTablesFields = z.enum([
  NetworkTopTablesFields.bytes_in,
  NetworkTopTablesFields.bytes_out,
  NetworkTopTablesFields.flows,
  NetworkTopTablesFields.destination_ips,
  NetworkTopTablesFields.source_ips,
]);
