/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  IScopedClusterClient,
  Logger,
  SavedObjectsClientContract,
  KibanaRequest,
} from 'kibana/server';

import { LicensingPluginSetup } from '../../../../licensing/server';
import { SecurityPluginStart } from '../../../../security/server';

import { ReindexOperation, ReindexStatus } from '../../../common/types';

import { reindexActionsFactory } from '../../lib/reindexing/reindex_actions';
import { reindexServiceFactory } from '../../lib/reindexing';
import { CredentialStore } from '../../lib/reindexing/credential_store';
import { error } from '../../lib/reindexing/error';

interface ReindexHandlerArgs {
  savedObjects: SavedObjectsClientContract;
  dataClient: IScopedClusterClient;
  indexName: string;
  log: Logger;
  licensing: LicensingPluginSetup;
  request: KibanaRequest;
  credentialStore: CredentialStore;
  reindexOptions?: {
    enqueue?: boolean;
  };
  security?: SecurityPluginStart;
}

export const reindexHandler = async ({
  credentialStore,
  dataClient,
  request,
  indexName,
  licensing,
  log,
  savedObjects,
  reindexOptions,
  security,
}: ReindexHandlerArgs): Promise<ReindexOperation> => {
  const callAsCurrentUser = dataClient.asCurrentUser;
  const reindexActions = reindexActionsFactory(savedObjects, callAsCurrentUser);
  const reindexService = reindexServiceFactory(callAsCurrentUser, reindexActions, log, licensing);

  if (!(await reindexService.hasRequiredPrivileges(indexName))) {
    throw error.accessForbidden(
      i18n.translate('xpack.upgradeAssistant.reindex.reindexPrivilegesErrorBatch', {
        defaultMessage: `You do not have adequate privileges to reindex "{indexName}".`,
        values: { indexName },
      })
    );
  }

  const existingOp = await reindexService.findReindexOperation(indexName);

  // If the reindexOp already exists and it's paused, resume it. Otherwise create a new one.
  const reindexOp =
    existingOp && existingOp.attributes.status === ReindexStatus.paused
      ? await reindexService.resumeReindexOperation(indexName, reindexOptions)
      : await reindexService.createReindexOperation(indexName, reindexOptions);

  // Add users credentials for the worker to use
  await credentialStore.set({ reindexOp, request, security });

  return reindexOp.attributes;
};
