/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { ManagementAppLocator } from '@kbn/management-plugin/common';
import { LocatorDefinition } from '@kbn/share-plugin/public';
import { linkToSnapshots } from './application/services/navigation';
import { PLUGIN } from '../common/constants';

export const SNAPSHOT_RESTORE_LOCATOR_ID = 'SNAPSHOT_RESTORE_LOCATOR';

export interface SnapshotRestoreLocatorParams extends SerializableRecord {
  page: 'snapshots';
}

export interface SnapshotRestoreLocatorDefinitionDependencies {
  managementAppLocator: ManagementAppLocator;
}

export class SnapshotRestoreLocatorDefinition
  implements LocatorDefinition<SnapshotRestoreLocatorParams>
{
  constructor(protected readonly deps: SnapshotRestoreLocatorDefinitionDependencies) {}

  public readonly id = SNAPSHOT_RESTORE_LOCATOR_ID;

  public readonly getLocation = async (params: SnapshotRestoreLocatorParams) => {
    const location = await this.deps.managementAppLocator.getLocation({
      sectionId: 'data',
      appId: PLUGIN.id,
    });

    switch (params.page) {
      case 'snapshots': {
        return {
          ...location,
          path: location.path + linkToSnapshots(),
        };
      }
    }
  };
}
