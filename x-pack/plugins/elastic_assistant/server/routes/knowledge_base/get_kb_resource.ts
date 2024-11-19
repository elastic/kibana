/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';
import { CreateKnowledgeBaseRequestParams } from '@kbn/elastic-assistant-common';

/**
 * Returns the optional resource, e.g. `esql` from the request params, or undefined if it doesn't exist
 *
 * @param request A REST request
 *
 * @returns Returns the optional resource, e.g. `esql` from the request params, or undefined if it doesn't exist
 */
export const getKbResource = (
  request: KibanaRequest<CreateKnowledgeBaseRequestParams> | undefined
): string | undefined => {
  if (request?.params?.resource != null) {
    return decodeURIComponent(request.params.resource);
  } else {
    return undefined;
  }
};
