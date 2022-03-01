/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_BLOCKLISTS_LIST_ID } from '@kbn/securitysolution-list-constants';
import { HttpStart } from 'kibana/public';
import { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';
import { BLOCKLISTS_LIST_DEFINITION } from '../constants';

/**
 * Blocklist exceptions Api client class using ExceptionsListApiClient as base class
 * It follow the Singleton pattern.
 * Please, use the getInstance method instead of creating a new instance when using this implementation.
 */
export class BlocklistsApiClient extends ExceptionsListApiClient {
  constructor(http: HttpStart) {
    super(http, ENDPOINT_BLOCKLISTS_LIST_ID, BLOCKLISTS_LIST_DEFINITION);
  }

  public static getInstance(http: HttpStart): ExceptionsListApiClient {
    return super.getInstance(http, ENDPOINT_BLOCKLISTS_LIST_ID, BLOCKLISTS_LIST_DEFINITION);
  }
}
