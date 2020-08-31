/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResolverRelatedEvents, ResolverTree } from '../../../../common/endpoint/types';

interface ServerReturnedResolverData {
  readonly type: 'serverReturnedResolverData';
  readonly payload: {
    /**
     * The result of fetching data
     */
    result: ResolverTree;
    /**
     * The database document ID that was used to fetch the resolver tree
     */
    databaseDocumentID: string;
  };
}

interface AppRequestedResolverData {
  readonly type: 'appRequestedResolverData';
  /**
   * entity ID used to make the request.
   */
  readonly payload: string;
}

interface ServerFailedToReturnResolverData {
  readonly type: 'serverFailedToReturnResolverData';
  /**
   * entity ID used to make the failed request
   */
  readonly payload: string;
}

interface AppAbortedResolverDataRequest {
  readonly type: 'appAbortedResolverDataRequest';
  /**
   * entity ID used to make the aborted request
   */
  readonly payload: string;
}

/**
 * Will occur when a request for related event data is unsuccessful.
 */
interface ServerFailedToReturnRelatedEventData {
  readonly type: 'serverFailedToReturnRelatedEventData';
  readonly payload: string;
}

/**
 * When related events are returned from the server
 */
interface ServerReturnedRelatedEventData {
  readonly type: 'serverReturnedRelatedEventData';
  readonly payload: ResolverRelatedEvents;
}

export type DataAction =
  | ServerReturnedResolverData
  | ServerFailedToReturnResolverData
  | ServerFailedToReturnRelatedEventData
  | ServerReturnedRelatedEventData
  | AppRequestedResolverData
  | AppAbortedResolverDataRequest;
