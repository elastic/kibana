/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { ActionExecutionSource, isSavedObjectExecutionSource } from '../lib';
import { ALERT_SAVED_OBJECT_TYPE } from '../constants/saved_objects';
import { SavedObjectExecutionSource } from '../lib/action_execution_source';

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

export async function bulkGetAuthorizationModeBySource(
  logger: Logger,
  unsecuredSavedObjectsClient: SavedObjectsClientContract,
  executionSources: Array<ActionExecutionSource<unknown>> = []
): Promise<Record<AuthorizationMode, number>> {
  const authModes = { [AuthorizationMode.Legacy]: 0, [AuthorizationMode.RBAC]: 0 };

  const alertSavedObjectExecutionSources: SavedObjectExecutionSource[] = executionSources.filter(
    (source) =>
      isSavedObjectExecutionSource(source) && source?.source?.type === ALERT_SAVED_OBJECT_TYPE
  ) as SavedObjectExecutionSource[];

  // If no ALERT_SAVED_OBJECT_TYPE source, default to RBAC
  if (alertSavedObjectExecutionSources.length === 0) {
    authModes[AuthorizationMode.RBAC] = 1;
    return authModes;
  }

  // Collect the unique rule IDs for ALERT_SAVED_OBJECT_TYPE sources and bulk get the associated SOs
  const rulesIds = new Set(
    alertSavedObjectExecutionSources.map((source: SavedObjectExecutionSource) => source?.source?.id)
  );

  // Get rule saved objects to determine whether to use RBAC or legacy authorization source
  const ruleSOs = await unsecuredSavedObjectsClient.bulkGet<{
    meta?: {
      versionApiKeyLastmodified?: string;
    };
  }>(
    [...rulesIds].map((id) => ({
      type: ALERT_SAVED_OBJECT_TYPE,
      id,
    }))
  );

  return ruleSOs.saved_objects.reduce((acc, ruleSO) => {
    if (ruleSO.error) {
      logger.warn(
        `Error retrieving saved object [${ruleSO.type}/${ruleSO.id}] - ${ruleSO.error?.message} - default to using RBAC authorization mode.`
      );
      // If there's an error retrieving the saved object, default to RBAC auth mode to avoid privilege de-escalation
      authModes[AuthorizationMode.RBAC]++;
    } else {
      // Check whether this is a legacy rule
      const isLegacy = ruleSO.attributes?.meta?.versionApiKeyLastmodified === LEGACY_VERSION;
      if (isLegacy) {
        authModes[AuthorizationMode.Legacy]++;
      } else {
        authModes[AuthorizationMode.RBAC]++;
      }
    }
    return acc;
  }, authModes);
}
