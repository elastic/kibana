/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewBase } from '@kbn/es-query';
import { IIndexPattern } from '../../../../../../src/plugins/data_views/common';
import { Immutable } from '../../../common/endpoint/types';

// type change for SearchBarProps
export const dataViewToIndexPattern = (
  value: DataViewBase | Immutable<DataViewBase>
): IIndexPattern => value as IIndexPattern;
