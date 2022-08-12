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
  executionSources: Array<ActionExecutionSource<unknown>> = []
): Promise<Record<string, number>> {
  const count = { [AuthorizationMode.Legacy]: 0, [AuthorizationMode.RBAC]: 0 };
  if (executionSources.length === 0) {
    count[AuthorizationMode.RBAC] = 1;
    return count;
  }
  const alerts = await unsecuredSavedObjectsClient.bulkGet<{
    meta?: {
      versionApiKeyLastmodified?: string;
    };
  }>(
    executionSources.map((es) => ({
      type: ALERT_SAVED_OBJECT_TYPE,
      id: get(es, 'source.id'),
    }))
  );
  const legacyVersions: Record<string, boolean> = alerts.saved_objects.reduce(
    (acc, so) => ({
      ...acc,
      [so.id]: so.attributes.meta?.versionApiKeyLastmodified === LEGACY_VERSION,
    }),
    {}
  );
  return executionSources.reduce((acc, es) => {
    const isAlertSavedObject =
      isSavedObjectExecutionSource(es) && es.source?.type === ALERT_SAVED_OBJECT_TYPE;
    const isLegacyVersion = legacyVersions[get(es, 'source.id')];
    const key =
      isAlertSavedObject && isLegacyVersion ? AuthorizationMode.Legacy : AuthorizationMode.RBAC;
    acc[key]++;
    return acc;
  }, count);
}
