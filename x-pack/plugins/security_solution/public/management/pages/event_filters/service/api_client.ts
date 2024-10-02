/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import type { HttpStart } from '@kbn/core/public';
import type {
  CreateExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { removeIdFromExceptionItemsEntries } from '@kbn/securitysolution-list-hooks';
import type { EndpointSuggestionsBody } from '../../../../../common/api/endpoint';
import { SUGGESTIONS_ROUTE } from '../../../../../common/endpoint/constants';
import { resolvePathVariables } from '../../../../common/utils/resolve_path_variables';
import { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';
import { EVENT_FILTER_LIST_DEFINITION } from '../constants';

function writeTransform<T extends CreateExceptionListItemSchema | UpdateExceptionListItemSchema>(
  item: T
): T {
  return removeIdFromExceptionItemsEntries(item) as T;
}

/**
 * Event filters Api client class using ExceptionsListApiClient as base class
 * It follow the Singleton pattern.
 * Please, use the getInstance method instead of creating a new instance when using this implementation.
 */
export class EventFiltersApiClient extends ExceptionsListApiClient {
  constructor(http: HttpStart) {
    super(
      http,
      ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
      EVENT_FILTER_LIST_DEFINITION,
      undefined,
      writeTransform
    );
  }

  public static getInstance(http: HttpStart): ExceptionsListApiClient {
    return super.getInstance(
      http,
      ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
      EVENT_FILTER_LIST_DEFINITION,
      undefined,
      writeTransform
    );
  }

  /**
   * Returns suggestions for given field
   */
  async getSuggestions(body: EndpointSuggestionsBody): Promise<string[]> {
    const result: string[] = await this.getHttp().post(
      resolvePathVariables(SUGGESTIONS_ROUTE, { suggestion_type: 'eventFilters' }),
      {
        version: this.version,
        body: JSON.stringify(body),
      }
    );

    return result;
  }
}
