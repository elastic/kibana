/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { ActionExecutionSource, isSavedObjectExecutionSource } from '../lib';

const LEGACY_VERSION = 'pre-7.10.0';

export async function shouldLegacyRbacApplyBySource(
  unsecuredSavedObjectsClient: SavedObjectsClientContract,
  executionSource?: ActionExecutionSource<unknown>
): Promise<boolean> {
  return isSavedObjectExecutionSource(executionSource) && executionSource?.source?.type === 'alert'
    ? (
        await unsecuredSavedObjectsClient.get<{
          meta?: {
            versionLastmodified?: string;
          };
        }>('alert', executionSource.source.id)
      ).attributes.meta?.versionLastmodified === LEGACY_VERSION
    : false;
}
