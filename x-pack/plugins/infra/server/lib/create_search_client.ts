/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RequestHandlerContext } from 'src/core/server';
import { CallWithRequestParams, InfraDatabaseSearchResponse } from './adapters/framework';
import { KibanaFramework } from './adapters/framework/kibana_framework_adapter';

export const createSearchClient = (
  requestContext: RequestHandlerContext,
  framework: KibanaFramework
) => <Hit = {}, Aggregation = undefined>(
  opts: CallWithRequestParams
): Promise<InfraDatabaseSearchResponse<Hit, Aggregation>> =>
  framework.callWithRequest(requestContext, 'search', opts);
