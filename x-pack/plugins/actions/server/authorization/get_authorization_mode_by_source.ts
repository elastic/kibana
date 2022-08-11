/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { get } from 'lodash';
import { ActionExecutionSource, isSavedObjectExecutionSource } from '../lib';
import { ALERT_SAVED_OBJECT_TYPE } from '../constants/saved_objects';
import { ExecuteOptions } from '../create_execute_function';

const LEGACY_VERSION = 'pre-7.10.0';

export enum AuthorizationMode {
  Legacy,
  RBAC,
}

export async function getAuthorizationModeBySource(
  unsecuredSavedObjectsClient: SavedObjectsClientContract,
  executionSource?: ActionExecutionSource<unknown>
): Promise<AuthorizationMode> {
  return isSavedObjectExecutionSource(executionSource) &&
    executionSource?.source?.type === ALERT_SAVED_OBJECT_TYPE &&
    (
      await unsecuredSavedObjectsClient.get<{
        meta?: {
          versionApiKeyLastmodified?: string;
        };
      }>(ALERT_SAVED_OBJECT_TYPE, executionSource.source.id)
    ).attributes.meta?.versionApiKeyLastmodified === LEGACY_VERSION
    ? AuthorizationMode.Legacy
    : AuthorizationMode.RBAC;
}

export async function getBulkAuthorizationModeBySource(
  unsecuredSavedObjectsClient: SavedObjectsClientContract,
  executionOptions: ExecuteOptions[] = []
): Promise<AuthorizationMode> {
  if (executionOptions.length === 0) {
    return AuthorizationMode.RBAC;
  }
  const isAlertSavedObject = executionOptions?.every(
    (eo) =>
      isSavedObjectExecutionSource(eo.source) && eo.source?.source?.type === ALERT_SAVED_OBJECT_TYPE
  );
  const alerts = await unsecuredSavedObjectsClient.bulkGet<{
    meta?: {
      versionApiKeyLastmodified?: string;
    };
  }>(
    executionOptions.map((eo) => ({
      type: ALERT_SAVED_OBJECT_TYPE,
      id: get(eo, 'source.source.id'),
    }))
  );
  const isLegacyVersion = alerts.saved_objects.every(
    (so) => so.attributes.meta?.versionApiKeyLastmodified === LEGACY_VERSION
  );
  return isAlertSavedObject && isLegacyVersion ? AuthorizationMode.Legacy : AuthorizationMode.RBAC;
}
