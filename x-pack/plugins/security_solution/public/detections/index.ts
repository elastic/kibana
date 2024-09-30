/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { TableId } from '@kbn/securitysolution-data-table';
import type { TableIdLiteral } from '@kbn/securitysolution-data-table';
import { getDataTablesInStorageByIds } from '../timelines/containers/local_storage';
import { routes } from './routes';
import type { SecuritySubPlugin } from '../app/types';
import { runDetectionMigrations } from './migrations';

export const DETECTIONS_TABLE_IDS: TableIdLiteral[] = [
  TableId.alertsOnRuleDetailsPage,
  TableId.alertsOnAlertsPage,
];

export class Detections {
  public setup() {}

  public start(storage: Storage): SecuritySubPlugin {
    runDetectionMigrations();

    return {
      storageDataTables: {
        tableById: getDataTablesInStorageByIds(storage, DETECTIONS_TABLE_IDS),
      },
      routes,
    };
  }
}
