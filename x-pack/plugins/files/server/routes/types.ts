/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RequestHandlerContext,
  IRouter,
  RequestHandler,
  RouteMethod,
  KibanaResponseFactory,
  IKibanaResponse,
} from '@kbn/core/server';
import type { FileServiceFactory } from '../file_service';
import type { UploadEndpoint } from '../services';

export interface FilesRequestHandlerContext extends RequestHandlerContext {
  files: {
    fileServiceFactory: FileServiceFactory;
    uploadEndpoint: UploadEndpoint;
  };
}

export type FilesRouter = IRouter<FilesRequestHandlerContext>;

export type FilesRequestHandler<
  P = unknown,
  Q = unknown,
  B = unknown,
  Method extends RouteMethod = any
> = RequestHandler<P, Q, B, FilesRequestHandlerContext, Method, KibanaResponseFactory>;

export type AsyncResponse<T> = Promise<IKibanaResponse<T>>;
