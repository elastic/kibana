/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { IndexWriteFailure, Settings } from '../common';

export async function writeDataToIndex(
  index: string,
  data: object,
  asCurrentUser: ElasticsearchClient
) {
  try {
    const settings: Settings = { index, body: data };
    const { body: resp } = await asCurrentUser.index(settings);
    if (resp.errors) {
      throw resp;
    } else {
      return {
        success: true,
        doc: data,
        failures: [],
      };
    }
  } catch (error) {
    let failures: IndexWriteFailure[] = [];
    let ingestError = false;
    if (error.errors !== undefined && Array.isArray(error.items)) {
      failures = getFailures(error.items, data);
    } else {
      // some other error has happened.
      ingestError = true;
    }

    return {
      success: false,
      error,
      failures,
      ingestError,
    };
  }
}

function getFailures(items: any[], data: object): IndexWriteFailure[] {
  const failures = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.index && item.index.error) {
      failures.push({
        item: i,
        reason: item.index.error.reason,
        doc: data,
      });
    }
  }
  return failures;
}
