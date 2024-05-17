/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Registry } from '@kbn/interpreter';
import { Datasource } from './datasource';
import type { DatasourceProps, Datasource as DatasourceType } from './datasource';

class DatasourceRegistry extends Registry<DatasourceProps, DatasourceType> {
  wrapper(obj: DatasourceProps): DatasourceType {
    return new Datasource(obj);
  }
}

export const datasourceRegistry = new DatasourceRegistry();
