/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { Dataset } from '../models/dataset';
import { datasetRT } from '../types';
import { sortOrderRT } from './common';

export const findDatasetsResponseRT = rt.type({
  items: rt.array(datasetRT),
});

export const findDatasetsRequestQueryRT = rt.exact(
  rt.partial({
    datasetQuery: rt.string,
    type: rt.literal('logs'),
    sortOrder: sortOrderRT,
    uncategorisedOnly: rt.boolean,
  })
);

export type FindDatasetsRequestQuery = rt.TypeOf<typeof findDatasetsRequestQueryRT>;
export type FindDatasetsResponse = rt.TypeOf<typeof findDatasetsResponseRT>;
export interface FindDatasetValue {
  items: Dataset[];
}
