/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

const indexFieldDescriptorRT = rt.type({
  name: rt.string,
  type: rt.string,
  searchable: rt.boolean,
  aggregatable: rt.boolean,
  displayable: rt.boolean,
});

export type IndexFieldDescriptor = rt.TypeOf<typeof indexFieldDescriptorRT>;

export const getIndexFieldsRequestParamsRT = rt.type({
  indexPattern: rt.string,
});

export const getIndexFieldsResponsePayloadRT = rt.type({
  data: rt.array(indexFieldDescriptorRT),
});
