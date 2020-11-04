/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { ActionExecutionSource, isSavedObjectExecutionSource } from '../lib';
import { ALERT_SAVED_OBJECT_TYPE } from '../saved_objects';

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
