/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { EqlSearchStrategyRequest, EqlSearchStrategyResponse } from '@kbn/data-plugin/common';
import { EQL_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { EqlOptions } from '../../../../common/search_strategy';
import {
  getValidationErrors,
  isErrorResponse,
  isMappingErrorResponse,
  isParsingErrorResponse,
  isVerificationErrorResponse,
} from '../../../../common/search_strategy/eql';

export enum EQL_ERROR_CODES {
  FAILED_REQUEST = 'EQL_ERR_FAILED_REQUEST',
  INVALID_EQL = 'EQL_ERR_INVALID_EQL',
  INVALID_SYNTAX = 'EQL_ERR_INVALID_SYNTAX',
  MISSING_DATA_SOURCE = 'EQL_ERR_MISSING_DATA_SOURCE',
}

interface Params {
  dataViewTitle: string;
  query: string;
  data: DataPublicPluginStart;
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  eqlOptions: Omit<EqlOptions, 'query' | 'size'> | undefined;
  signal?: AbortSignal;
}

export interface EqlResponseError {
  code: EQL_ERROR_CODES;
  messages?: string[];
  error?: Error;
}

export interface ValidateEqlResponse {
  valid: boolean;
  error?: EqlResponseError;
}

export const validateEql = async ({
  data,
  dataViewTitle,
  query,
  runtimeMappings,
  eqlOptions,
  signal,
}: Params): Promise<ValidateEqlResponse> => {
  try {
    const { rawResponse: response } = await firstValueFrom(
      data.search.search<EqlSearchStrategyRequest, EqlSearchStrategyResponse>(
        {
          params: {
            index: dataViewTitle,
            body: { query, runtime_mappings: runtimeMappings, size: 0 },
            // Prevent passing empty string values
            timestamp_field: eqlOptions?.timestampField ? eqlOptions.timestampField : undefined,
            tiebreaker_field: eqlOptions?.tiebreakerField ? eqlOptions.tiebreakerField : undefined,
            event_category_field: eqlOptions?.eventCategoryField
              ? eqlOptions.eventCategoryField
              : undefined,
          },
          options: { ignore: [400] },
        },
        {
          strategy: EQL_SEARCH_STRATEGY,
          abortSignal: signal,
        }
      )
    );
    if (isParsingErrorResponse(response)) {
      return {
        valid: false,
        error: { code: EQL_ERROR_CODES.INVALID_SYNTAX, messages: getValidationErrors(response) },
      };
    }

    if (isVerificationErrorResponse(response) || isMappingErrorResponse(response)) {
      return {
        valid: false,
        error: { code: EQL_ERROR_CODES.INVALID_EQL, messages: getValidationErrors(response) },
      };
    }

    if (isErrorResponse(response)) {
      return {
        valid: false,
        error: { code: EQL_ERROR_CODES.FAILED_REQUEST, error: new Error(JSON.stringify(response)) },
      };
    }

    return { valid: true };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('index_not_found_exception')) {
      return {
        valid: false,
        error: { code: EQL_ERROR_CODES.MISSING_DATA_SOURCE, messages: [error.message] },
      };
    }

    return {
      valid: false,
      error: {
        code: EQL_ERROR_CODES.FAILED_REQUEST,
        error,
      },
    };
  }
};
