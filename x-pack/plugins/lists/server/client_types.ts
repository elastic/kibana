/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PassThrough, Readable } from 'stream';

import { KibanaRequest } from 'src/core/server';

import { SecurityPluginSetup } from '../../security/server';
import { SpacesServiceSetup } from '../../spaces/server';
import { Type } from '../common/schemas';

import { ConfigType } from './config';
import { DataClient } from './types';

export interface ConstructorOptions {
  config: ConfigType;
  dataClient: DataClient;
  request: KibanaRequest;
  spaces: SpacesServiceSetup | undefined | null;
  security: SecurityPluginSetup;
}

export interface GetListOptions {
  id: string;
}

export interface DeleteListOptions {
  id: string;
}

export interface DeleteListItemOptions {
  id: string;
}

export interface CreateListOptions {
  id: string | undefined | null;
  name: string;
  description: string;
  type: Type;
}

export interface CreateListIfItDoesNotExistOptions {
  id: string;
  name: string;
  description: string;
  type: Type;
}

export interface DeleteListItemByValueOptions {
  listId: string;
  value: string;
  type: Type;
}

export interface GetListItemByValueOptions {
  listId: string;
  value: string;
  type: Type;
}

export interface ExportListItemsToStreamOptions {
  stringToAppend: string | null | undefined;
  listId: string;
  stream: PassThrough;
}

export interface ImportListItemsToStreamOptions {
  listId: string;
  type: Type;
  stream: Readable;
}

export interface CreateListItemOptions {
  id: string | null | undefined;
  listId: string;
  type: Type;
  value: string;
}

export interface UpdateListItemOptions {
  id: string;
  value: string | null | undefined;
}

export interface UpdateListOptions {
  id: string;
  name: string | undefined | null;
  description: string | undefined | null;
}

export interface GetListItemOptions {
  id: string;
}

export interface GetListItemsByValueOptions {
  type: Type;
  listId: string;
  value: string[];
}
