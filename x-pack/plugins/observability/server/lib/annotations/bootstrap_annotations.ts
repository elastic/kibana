/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  PluginInitializerContext,
  KibanaRequest,
  RequestHandlerContext,
} from 'kibana/server';
import { LicensingApiRequestHandlerContext } from '../../../../licensing/server';
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
    getScopedAnnotationsClient: (
      requestContext: RequestHandlerContext & { licensing: LicensingApiRequestHandlerContext },
      request: KibanaRequest
    ) => {
      return createAnnotationsClient({
        index,
        esClient: requestContext.core.elasticsearch.client.asCurrentUser,
        logger,
        license: requestContext.licensing?.license,
      });
    },
  };
}
