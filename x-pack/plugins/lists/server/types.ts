/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ScopedClusterClient, IContextProvider, RequestHandler } from 'kibana/server';

import { Type } from '../common/schemas';
import { SpacesPluginSetup } from '../../spaces/server';
import { SecurityPluginSetup } from '../../security/server';

import { ListsClient } from './services/lists/client';

// TODO: Change this to io-ts under common/schemas

export interface BaseElasticListType {
  name: string;
  description: string;
  type: Type;
  tie_breaker_id: string;
  meta?: object; // TODO: Implement this in the code
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export type ElasticListReturnType = BaseElasticListType;
export type ElasticListInputType = BaseElasticListType;

export interface ElasticListUpdateInputType {
  name: string | null | undefined;
  description: string | null | undefined;
  meta?: object | null | undefined; // TODO: Implement this in the code
  updated_at: string;
  updated_by: string;
}

export interface BaseElasticListItemType {
  list_id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  tie_breaker_id: string;
  meta?: object; // TODO: Implement this in the code
}

export type ElasticListItemReturnType = BaseElasticListItemType & {
  ip: string | null | undefined;
  keyword: string | null | undefined;
};

export type ElasticListItemsType =
  | {
      ip: string;
    }
  | {
      keyword: string;
    };

export type ElasticListItemUpdateInputType = {
  meta?: object | null | undefined; // TODO: Implement this in the code
  updated_at: string;
  updated_by: string;
} & ElasticListItemsType;

export type ElasticListItemsInputType = BaseElasticListItemType & ElasticListItemsType;

export type DataClient = Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
export type ContextProvider = IContextProvider<RequestHandler<unknown, unknown, unknown>, 'lists'>;

export interface PluginsSetup {
  security: SecurityPluginSetup;
  spaces: SpacesPluginSetup | undefined | null;
}

export type ContextProviderReturn = Promise<{ getListsClient: () => ListsClient }>;
declare module 'src/core/server' {
  interface RequestHandlerContext {
    lists?: {
      getListsClient: () => ListsClient;
    };
  }
}
