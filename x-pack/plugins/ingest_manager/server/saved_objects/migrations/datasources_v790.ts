/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectMigrationFn } from 'kibana/server';
import { cloneDeep } from 'lodash';
import { Datasource } from '../../types/models';

type Pre790Datasource = Exclude<
  Datasource,
  'created_on' | 'created_by' | 'updated_on' | 'updated_by'
>;

export const migrateDatasourcesToV790: SavedObjectMigrationFn<
  Pre790Datasource,
  Datasource
> = doc => {
  const updatedDatasource = cloneDeep(doc);
  const defDate = new Date().toISOString();

  updatedDatasource.attributes.created_by = 'system';
  updatedDatasource.attributes.created_on = updatedDatasource?.updated_at ?? defDate;
  updatedDatasource.attributes.updated_by = 'system';
  updatedDatasource.attributes.updated_on = updatedDatasource?.updated_at ?? defDate;

  return updatedDatasource;
};
