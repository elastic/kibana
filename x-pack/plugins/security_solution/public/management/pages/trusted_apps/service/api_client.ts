/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '@kbn/securitysolution-list-constants';

import { HttpStart } from 'kibana/public';
import { ConditionEntry } from '../../../../../common/endpoint/types';
import {
  conditionEntriesToEntries,
  entriesToConditionEntries,
} from '../../../../common/utils/exception_list_items';
import { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';
import { TRUSTED_APPS_EXCEPTION_LIST_DEFINITION } from '../constants';

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
    entries: conditionEntriesToEntries(item.entries as ConditionEntry[], true),
  } as T;
}

/**
 * Trusted Apps exceptions Api client class using ExceptionsListApiClient as base class
 * It follows the Singleton pattern.
 * Please, use the getInstance method instead of creating a new instance when using this implementation.
 */
export class TrustedAppsApiClient extends ExceptionsListApiClient {
  constructor(http: HttpStart) {
    super(
      http,
      ENDPOINT_TRUSTED_APPS_LIST_ID,
      TRUSTED_APPS_EXCEPTION_LIST_DEFINITION,
      readTransform,
      writeTransform
    );
  }

  public static getInstance(http: HttpStart): ExceptionsListApiClient {
    return super.getInstance(
      http,
      ENDPOINT_TRUSTED_APPS_LIST_ID,
      TRUSTED_APPS_EXCEPTION_LIST_DEFINITION,
      readTransform,
      writeTransform
    );
  }
}
