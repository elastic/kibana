/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraESSearchBody, InfraProcesorRequestOptions } from '../adapter_types';
import { createLastNProcessor } from '../processors/last';

export function createNodeRequestBody(options: InfraProcesorRequestOptions): InfraESSearchBody {
  const requestProcessor = createLastNProcessor(options);
  const doc = {};
  const body = requestProcessor(doc);
  return body;
}
