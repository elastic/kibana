/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf, Type } from '@kbn/config-schema';
import { PLUGIN_ID } from './constants';

export const API_BASE_PATH = `/api/${PLUGIN_ID}`;

export const FILES_API_BASE_PATH = `${API_BASE_PATH}/files`;

export const FILES_SHARE_API_BASE_PATH = `${API_BASE_PATH}/shares`;

export const FILES_PUBLIC_API_BASE_PATH = `${API_BASE_PATH}/public`;

export interface EndpointInputs<
  P extends Type<unknown> = Type<unknown>,
  Q extends Type<unknown> = Type<unknown>,
  B extends Type<unknown> = Type<unknown>
> {
  params?: P;
  query?: Q;
  body?: B;
}

export interface CreateRouteDefinition<Inputs extends EndpointInputs, R> {
  inputs: {
    params: TypeOf<NonNullable<Inputs['params']>>;
    query: TypeOf<NonNullable<Inputs['query']>>;
    body: TypeOf<NonNullable<Inputs['body']>>;
  };
  output: R;
}

export type AnyEndpoint = CreateRouteDefinition<EndpointInputs, unknown>;

/**
 * Abstract type definition for API route inputs and outputs.
 *
 * These definitions should be shared between the public and server
 * as the single source of truth.
 */
export interface HttpApiInterfaceEntryDefinition<
  P = unknown,
  Q = unknown,
  B = unknown,
  R = unknown
> {
  inputs: {
    params: P;
    query: Q;
    body: B;
  };
  output: R;
}

export type { Endpoint as CreateFileKindHttpEndpoint } from '../server/routes/file_kind/create';
export type { Endpoint as DeleteFileKindHttpEndpoint } from '../server/routes/file_kind/delete';
export type { Endpoint as DownloadFileKindHttpEndpoint } from '../server/routes/file_kind/download';
export type { Endpoint as GetByIdFileKindHttpEndpoint } from '../server/routes/file_kind/get_by_id';
export type { Endpoint as ListFileKindHttpEndpoint } from '../server/routes/file_kind/list';
export type { Endpoint as UpdateFileKindHttpEndpoint } from '../server/routes/file_kind/update';
export type { Endpoint as UploadFileKindHttpEndpoint } from '../server/routes/file_kind/upload';
export type { Endpoint as FindFilesHttpEndpoint } from '../server/routes/find';
export type { Endpoint as FilesMetricsHttpEndpoint } from '../server/routes/metrics';
export type { Endpoint as FileShareHttpEndpoint } from '../server/routes/file_kind/share/share';
export type { Endpoint as FileUnshareHttpEndpoint } from '../server/routes/file_kind/share/unshare';
export type { Endpoint as FileGetShareHttpEndpoint } from '../server/routes/file_kind/share/get';
export type { Endpoint as FileListSharesHttpEndpoint } from '../server/routes/file_kind/share/list';
export type { Endpoint as FilePublicDownloadHttpEndpoint } from '../server/routes/public_facing/download';
