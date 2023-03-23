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
} from '@kbn/core/server';
import { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import { createAnnotationsClient } from './create_annotations_client';
import { registerAnnotationAPIs } from './register_annotation_apis';

interface Params {
  index: string;
  core: CoreSetup;
  context: PluginInitializerContext;
}

export type ScopedAnnotationsClientFactory = Awaited<
  ReturnType<typeof bootstrapAnnotations>
>['getScopedAnnotationsClient'];

export type ScopedAnnotationsClient = Awaited<ReturnType<ScopedAnnotationsClientFactory>>;
export type AnnotationsAPI = Awaited<ReturnType<typeof bootstrapAnnotations>>;

export async function bootstrapAnnotations({ index, core, context }: Params) {
  const logger = context.logger.get('annotations');

  registerAnnotationAPIs({
    core,
    index,
    logger,
  });

  return {
    getScopedAnnotationsClient: async (
      requestContext: RequestHandlerContext & {
        licensing: Promise<LicensingApiRequestHandlerContext>;
      },
      request: KibanaRequest
    ) => {
      const esClient = (await requestContext.core).elasticsearch.client;
      const { license } = await requestContext.licensing;
      return createAnnotationsClient({
        index,
        esClient: esClient.asCurrentUser,
        logger,
        license,
      });
    },
  };
}
