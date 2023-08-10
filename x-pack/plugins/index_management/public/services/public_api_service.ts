/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';
import { sendRequest } from '../shared_imports';
import { API_BASE_PATH } from '../../common/constants';

export interface PublicApiServiceSetup {
  getAllEnrichPolicies(): void;
}

/**
 * Index Management public API service
 */
export class PublicApiService {
  private http: HttpSetup;

  /**
   * constructor
   * @param http http dependency
   */
  constructor(http: HttpSetup) {
    this.http = http;
  }

  /**
   * Gets a list of all the enrich policies
   */
  getAllEnrichPolicies() {
    return sendRequest(this.http, {
      path: `${API_BASE_PATH}/enrich_policies`,
      method: 'get',
    });
  }
}
