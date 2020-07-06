/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams } from 'elasticsearch';
import { IEsSearchRequest } from '../../../../../src/plugins/data/common';

export interface EnhancedSearchParams extends SearchParams {
  ignoreThrottled: boolean;
}

export interface IEnhancedEsSearchRequest extends IEsSearchRequest {
  /**
   * Used to determine whether to use the _rollups_search or a regular search endpoint.
   */
  isRollup?: boolean;
}
