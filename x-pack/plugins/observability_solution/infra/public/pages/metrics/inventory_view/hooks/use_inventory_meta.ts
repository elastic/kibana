/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { useEffect } from 'react';
import { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { throwErrors, createPlainError } from '../../../../../common/runtime_types';
import { useHTTPRequest } from '../../../../hooks/use_http_request';
import {
  InventoryMetaResponseRT,
  InventoryMetaResponse,
} from '../../../../../common/http_api/inventory_meta_api';

export function useInventoryMeta(
  sourceId: string,
  nodeType: InventoryItemType,
  currentTime: number
) {
  const decodeResponse = (response: any) => {
    return pipe(
      InventoryMetaResponseRT.decode(response),
      fold(throwErrors(createPlainError), identity)
    );
  };

  const { error, loading, response, makeRequest } = useHTTPRequest<InventoryMetaResponse>(
    '/api/infra/inventory/meta',
    'POST',
    JSON.stringify({
      sourceId,
      nodeType,
      currentTime,
    }),
    decodeResponse
  );

  useEffect(() => {
    makeRequest();
  }, [makeRequest]);

  return {
    error,
    loading,
    accounts: response ? response.accounts : [],
    regions: response ? response.regions : [],
    makeRequest,
  };
}
