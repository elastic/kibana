/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Transform } from 'stream';
import type { AssetCriticalityUpsert } from '../types';
import { parseAndValidateRow } from './parse_and_validate_row';

class TransformCSVToUpsertRecords extends Transform {
  constructor() {
    super({
      objectMode: true,
    });
  }

  public _transform(
    chunk: string[],
    encoding: string,
    callback: (error: Error | null, data?: AssetCriticalityUpsert | Error) => void
  ) {
    try {
      const record = parseAndValidateRow(chunk);
      callback(null, record);
    } catch (err) {
      // we want to handle errors gracefully and continue processing the rest of the file
      callback(null, err);
    }
  }
}

export const transformCSVToUpsertRecords = () => new TransformCSVToUpsertRecords();
