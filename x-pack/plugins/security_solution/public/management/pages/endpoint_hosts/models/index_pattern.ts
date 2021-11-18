/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { all } from 'deepmerge';
import type { DataViewBase } from '@kbn/es-query';
import { Immutable } from '../../../../../common/endpoint/types';

export function clone(value: DataViewBase | Immutable<DataViewBase>): DataViewBase {
  return all([value]) as DataViewBase;
}
