/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LOCAL_STORAGE_MIGRATION_KEY,
  migrateEntityRiskLevelColumnTitle,
} from './migrates_risk_level_title';
import type { DataTableState } from '@kbn/securitysolution-data-table';
import {
  hostRiskLevelColumn,
  userRiskLevelColumn,
} from '../../../detections/configurations/security_solution_detections/columns';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { localStorageMock } from '../../../common/mock/mock_local_storage';
import { LOCAL_STORAGE_TABLE_KEY } from '.';

const getColumnsBeforeMigration = () => [
  { ...userRiskLevelColumn, displayAsText: undefined },
  { ...hostRiskLevelColumn, displayAsText: undefined },
];

let storage: Storage;

describe('migrateEntityRiskLevelColumnTitle', () => {
  beforeEach(() => {
    storage = new Storage(localStorageMock());
  });

  it('does NOT migrate `columns` when `columns` is not an array', () => {
    const dataTableState = {
      'alerts-page': {},
    } as unknown as DataTableState['dataTable']['tableById'];

    migrateEntityRiskLevelColumnTitle(storage, dataTableState);

    expect(dataTableState['alerts-page'].columns).toStrictEqual(undefined);
  });

  it('does not migrates columns if if it has already run once', () => {
    storage.set(LOCAL_STORAGE_MIGRATION_KEY, true);
    const dataTableState = {
      'alerts-page': {
        columns: getColumnsBeforeMigration(),
      },
    } as unknown as DataTableState['dataTable']['tableById'];

    migrateEntityRiskLevelColumnTitle(storage, dataTableState);

    expect(dataTableState['alerts-page'].columns).toStrictEqual(getColumnsBeforeMigration());
  });

  it('migrates columns saved to localStorage', () => {
    const dataTableState = {
      'alerts-page': {
        columns: getColumnsBeforeMigration(),
      },
    } as unknown as DataTableState['dataTable']['tableById'];

    migrateEntityRiskLevelColumnTitle(storage, dataTableState);

    // assert that it mutates the table model
    expect(dataTableState['alerts-page'].columns).toStrictEqual([
      userRiskLevelColumn,
      hostRiskLevelColumn,
    ]);
    // assert that it updates the migration flag on storage
    expect(storage.get(LOCAL_STORAGE_MIGRATION_KEY)).toEqual(true);
    // assert that it updates the table inside local storage
    expect(storage.get(LOCAL_STORAGE_TABLE_KEY)['alerts-page'].columns).toStrictEqual([
      userRiskLevelColumn,
      hostRiskLevelColumn,
    ]);
  });
});
