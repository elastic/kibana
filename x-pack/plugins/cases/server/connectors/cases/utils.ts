/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';
import type { BulkGetOracleRecordsResponse, OracleRecord, OracleRecordError } from './types';

export const isRecordError = (so: OracleRecord | OracleRecordError): so is OracleRecordError =>
  (so as OracleRecordError).error != null;

export const partitionRecordsByError = (
  res: BulkGetOracleRecordsResponse
): [OracleRecord[], OracleRecordError[]] => {
  const [errors, validRecords] = partition(res, isRecordError) as [
    OracleRecordError[],
    OracleRecord[]
  ];

  return [validRecords, errors];
};
