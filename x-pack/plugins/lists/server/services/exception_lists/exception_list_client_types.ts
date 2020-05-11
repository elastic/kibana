/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller, SavedObjectsClientContract } from 'kibana/server';

import {
  Description,
  IdOrUndefined,
  ListId,
  ListIdOrUndefined,
  MetaOrUndefined,
  Name,
  TagsOrUndefined,
  _TagsOrUndefined,
} from '../../../common/schemas';
import { ConfigType } from '../../config';

import { NamespaceType } from './types';

export interface ConstructorOptions {
  callCluster: APICaller;
  config: ConfigType;
  spaceId: string;
  user: string;
  savedObjectsClient: SavedObjectsClientContract;
}

export interface GetExceptionListOptions {
  listId: ListIdOrUndefined;
  id: IdOrUndefined;
  namespaceType: NamespaceType;
}

export interface CreateExceptionListOptions {
  _tags: _TagsOrUndefined;
  listId: ListId;
  namespaceType: NamespaceType;
  name: Name;
  description: Description;
  meta: MetaOrUndefined;
  tags: TagsOrUndefined;
}
