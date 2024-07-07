/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DataViewSpec } from '@kbn/data-views-plugin/common';
import { createAction } from '@reduxjs/toolkit';

type DataViewId = string;

export const init = createAction<DataViewId>('init');
export const selectDataView = createAction<DataViewId>('changeDataView');
export const setDataViewData = createAction<DataViewSpec>('setDataView');
export const setPatternList = createAction<string[]>('setPatternList');
