/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  CoreSetup,
  PluginInitializerContext,
  KibanaRequest,
  RequestHandlerContext,
} from 'kibana/server';
import { PromiseReturnType } from '../../../typings/common';
import { createAnnotationsClient } from './create_annotations_client';
import { registerAnnotationAPIs } from './register_annotation_apis';

interface Params {
  index: string;
  core: CoreSetup;
  context: PluginInitializerContext;
}

export type ScopedAnnotationsClientFactory = PromiseReturnType<
  typeof bootstrapAnnotations
>['getScopedAnnotationsClient'];

export type ScopedAnnotationsClient = ReturnType<ScopedAnnotationsClientFactory>;
export type AnnotationsAPI = PromiseReturnType<typeof bootstrapAnnotations>;

export async function bootstrapAnnotations({ index, core, context }: Params) {
  const logger = context.logger.get('annotations');

  registerAnnotationAPIs({
    core,
    index,
    logger,
  });

  return {
    getScopedAnnotationsClient: (requestContext: RequestHandlerContext, request: KibanaRequest) => {
      return createAnnotationsClient({
        index,
        apiCaller: requestContext.core.elasticsearch.legacy.client.callAsCurrentUser,
        logger,
        license: requestContext.licensing?.license,
      });
    },
  };
}
