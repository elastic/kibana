/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { set } from 'lodash/fp';

import { KibanaRequest, RequestHandlerContext } from 'src/core/server';

import { SetupPlugins } from '../../../../plugin';

import { FrameworkRequest } from '../../../framework';

export const buildFrameworkRequest = async (
  context: RequestHandlerContext,
  security: SetupPlugins['security'],
  request: KibanaRequest
): Promise<FrameworkRequest> => {
  const savedObjectsClient = context.core.savedObjects.client;
  const user = await security?.authc.getCurrentUser(request);

  return set<FrameworkRequest>(
    'user',
    user,
    set<KibanaRequest & { context: RequestHandlerContext }>(
      'context.core.savedObjects.client',
      savedObjectsClient,
      request
    )
  );
};

export enum TimelineStatusActions {
  create = 'create',
  createViaImport = 'createViaImport',
  update = 'update',
  updateViaImport = 'updateViaImport',
}

export type TimelineStatusAction =
  | TimelineStatusActions.create
  | TimelineStatusActions.createViaImport
  | TimelineStatusActions.update
  | TimelineStatusActions.updateViaImport;

export * from './compare_timelines_status';
export * from './timeline_object';
