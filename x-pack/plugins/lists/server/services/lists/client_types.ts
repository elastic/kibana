/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PassThrough, Readable } from 'stream';

import { APICaller, KibanaRequest } from 'kibana/server';

import { SecurityPluginSetup } from '../../../../security/server';
import {
  Description,
  DescriptionOrUndefined,
  Id,
  IdOrUndefined,
  MetaOrUndefined,
  Name,
  NameOrUndefined,
  Type,
} from '../../../common/schemas';
import { ConfigType } from '../../config';

export interface ConstructorOptions {
  callCluster: APICaller;
  config: ConfigType;
  request: KibanaRequest;
  spaceId: string;
  user: string;
  security: SecurityPluginSetup | undefined | null;
}

export interface GetListOptions {
  id: Id;
}

export interface DeleteListOptions {
  id: Id;
}

export interface DeleteListItemOptions {
  id: Id;
}

export interface CreateListOptions {
  id: IdOrUndefined;
  name: Name;
  description: Description;
  type: Type;
  meta: MetaOrUndefined;
}

export interface CreateListIfItDoesNotExistOptions {
  id: Id;
  name: Name;
  description: Description;
  type: Type;
  meta: MetaOrUndefined;
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
  meta: MetaOrUndefined;
}

export interface CreateListItemOptions {
  id: IdOrUndefined;
  listId: string;
  type: Type;
  value: string;
  meta: MetaOrUndefined;
}

export interface UpdateListItemOptions {
  id: Id;
  value: string | null | undefined;
  meta: MetaOrUndefined;
}

export interface UpdateListOptions {
  id: Id;
  name: NameOrUndefined;
  description: DescriptionOrUndefined;
  meta: MetaOrUndefined;
}

export interface GetListItemOptions {
  id: Id;
}

export interface GetListItemsByValueOptions {
  type: Type;
  listId: string;
  value: string[];
}
