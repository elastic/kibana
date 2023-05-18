/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { dataStreamRT } from '../types';
import { sortOrderRT } from './common';

export const findDataStreamsResponseRT = rt.type({
  items: rt.array(dataStreamRT),
});

export const findDataStreamsRequestQueryRT = rt.exact(
  rt.partial({
    datasetQuery: rt.string,
    type: rt.literal('logs'),
    sortOrder: sortOrderRT,
    uncategorisedOnly: rt.boolean,
  })
);

export type FindDataStreamsRequestQuery = rt.TypeOf<typeof findDataStreamsRequestQueryRT>;
export type FindDataStreamsResponse = rt.TypeOf<typeof findDataStreamsResponseRT>;
