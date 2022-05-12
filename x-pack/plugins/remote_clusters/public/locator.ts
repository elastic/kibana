/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { ManagementAppLocator } from '@kbn/management-plugin/common';
import { LocatorDefinition } from '@kbn/share-plugin/public';

export const REMOTE_CLUSTERS_LOCATOR_ID = 'REMOTE_CLUSTERS_LOCATOR';

export interface RemoteClustersLocatorParams extends SerializableRecord {
  page: 'remoteClusters';
}

export interface RemoteClustersLocatorDefinitionDependencies {
  managementAppLocator: ManagementAppLocator;
}

export class RemoteClustersLocatorDefinition
  implements LocatorDefinition<RemoteClustersLocatorParams>
{
  constructor(protected readonly deps: RemoteClustersLocatorDefinitionDependencies) {}

  public readonly id = REMOTE_CLUSTERS_LOCATOR_ID;

  public readonly getLocation = async (params: RemoteClustersLocatorParams) => {
    const location = await this.deps.managementAppLocator.getLocation({
      sectionId: 'data',
      appId: 'remote_clusters',
    });

    switch (params.page) {
      case 'remoteClusters': {
        return {
          ...location,
          path: location.path,
        };
      }
    }
  };
}
