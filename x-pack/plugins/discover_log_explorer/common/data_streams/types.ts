/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { indexPatternRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';

export const dataStreamRT = rt.exact(
  rt.intersection([
    rt.type({
      name: indexPatternRt,
    }),
    rt.partial({
      title: rt.string,
    }),
  ])
);

const integrationStatusRT = rt.union([
  rt.literal('installed'),
  rt.literal('installing'),
  rt.literal('install_failed'),
]);

export const integrationRT = rt.type({
  name: rt.string,
  status: integrationStatusRT,
  version: rt.string,
  dataStreams: rt.array(dataStreamRT),
});

export type DataStream = rt.TypeOf<typeof dataStreamRT>;
export type Integration = rt.TypeOf<typeof integrationRT>;
