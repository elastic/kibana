/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_BLOCKLISTS_LIST_ID } from '@kbn/securitysolution-list-constants';

import type { HttpStart } from '@kbn/core/public';
import type { ConditionEntry } from '../../../../../common/endpoint/types';
import {
  conditionEntriesToEntries,
  entriesToConditionEntries,
} from '../../../../common/utils/exception_list_items';
import { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';
import { BLOCKLISTS_LIST_DEFINITION } from '../constants';

function readTransform(item: ExceptionListItemSchema): ExceptionListItemSchema {
  return {
    ...item,
    entries: entriesToConditionEntries(item.entries) as ExceptionListItemSchema['entries'],
  };
}

function writeTransform<T extends CreateExceptionListItemSchema | UpdateExceptionListItemSchema>(
  item: T
): T {
  return {
    ...item,
    entries: conditionEntriesToEntries(item.entries as ConditionEntry[]),
  } as T;
}

/**
 * Blocklist exceptions Api client class using ExceptionsListApiClient as base class
 * It follows the Singleton pattern.
 * Please, use the getInstance method instead of creating a new instance when using this implementation.
 */
export class BlocklistsApiClient extends ExceptionsListApiClient {
  constructor(http: HttpStart) {
    super(
      http,
      ENDPOINT_BLOCKLISTS_LIST_ID,
      BLOCKLISTS_LIST_DEFINITION,
      readTransform,
      writeTransform
    );
  }

  public static getInstance(http: HttpStart): ExceptionsListApiClient {
    return super.getInstance(
      http,
      ENDPOINT_BLOCKLISTS_LIST_ID,
      BLOCKLISTS_LIST_DEFINITION,
      readTransform,
      writeTransform
    );
  }
}
