/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PivotEntity } from '../common/entities';

export const dataStreamsPivot: PivotEntity = {
  id: 'data_streams',
  displayName: 'Data streams',
  type: 'pivot',
  pivot: {
    type: 'data_stream',
    identityFields: ['data_stream.dataset', 'data_stream.type', 'data_stream.namespace'],
  },
  sources: [
    {
      indexPattern: '.data_streams*',
    },
  ],
};

export const builtinPivotTypes = [dataStreamsPivot];
