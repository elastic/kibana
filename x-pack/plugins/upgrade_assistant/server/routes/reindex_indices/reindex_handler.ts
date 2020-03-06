/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { IScopedClusterClient, Logger, SavedObjectsClientContract } from 'kibana/server';

import { LicensingPluginSetup } from '../../../../licensing/server';

import { ReindexOperation, ReindexOptions, ReindexStatus } from '../../../common/types';

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
  headers: Record<string, any>;
  credentialStore: CredentialStore;
  reindexOptions?: {
    openAndClose?: boolean;
    enqueue?: boolean;
  };
}

export const reindexHandler = async ({
  credentialStore,
  dataClient,
  headers,
  indexName,
  licensing,
  log,
  savedObjects,
  reindexOptions,
}: ReindexHandlerArgs): Promise<ReindexOperation> => {
  const callAsCurrentUser = dataClient.callAsCurrentUser.bind(dataClient);
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

  const opts: ReindexOptions | undefined = reindexOptions
    ? {
        openAndClose: reindexOptions.openAndClose,
        queueSettings: reindexOptions.enqueue ? { queuedAt: Date.now() } : undefined,
      }
    : undefined;

  // If the reindexOp already exists and it's paused, resume it. Otherwise create a new one.
  const reindexOp =
    existingOp && existingOp.attributes.status === ReindexStatus.paused
      ? await reindexService.resumeReindexOperation(indexName, opts)
      : await reindexService.createReindexOperation(indexName, opts);

  // Add users credentials for the worker to use
  credentialStore.set(reindexOp, headers);

  return reindexOp.attributes;
};
