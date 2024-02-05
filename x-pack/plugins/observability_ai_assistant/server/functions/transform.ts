/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { FunctionRegistrationParameters } from '.';
import { transformFunctionDefinition } from '../../common/functions/transform';

export function registerTransformFunction({
  registerFunction,
  resources,
}: FunctionRegistrationParameters) {
  registerFunction(transformFunctionDefinition, async ({ arguments: args }, signal) => {
    const request = args as TransformPutTransformRequest;

    const response = await (
      await resources.context.core
    ).elasticsearch.client.asCurrentUser.transform.putTransform(request);

    return { content: response };
  });
}
