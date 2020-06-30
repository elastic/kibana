/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectMigrationFn } from 'kibana/server';
import { cloneDeep } from 'lodash';
import { Datasource, DatasourceInput, DatasourceInputStream } from '../../types';

type Pre790Datasource = Exclude<
  Datasource,
  'created_at' | 'created_by' | 'updated_at' | 'updated_by'
> & {
  inputs: Array<
    Exclude<DatasourceInput, 'streams'> & {
      streams: Array<
        Exclude<DatasourceInputStream, 'dataset'> & {
          dataset: string;
        }
      >;
    }
  >;
};

export const migrateDatasourcesToV790: SavedObjectMigrationFn<Pre790Datasource, Datasource> = (
  doc
) => {
  const updatedDatasource = cloneDeep(doc);
  const defDate = new Date().toISOString();

  updatedDatasource.attributes.created_by = 'system';
  updatedDatasource.attributes.created_at = updatedDatasource?.updated_at ?? defDate;
  updatedDatasource.attributes.updated_by = 'system';
  updatedDatasource.attributes.updated_at = updatedDatasource?.updated_at ?? defDate;
  updatedDatasource.attributes.inputs.forEach((input) => {
    input.streams.forEach((stream) => {
      stream.dataset = { name: (stream.dataset as unknown) as string, type: '' };
    });
  });

  return updatedDatasource;
};
