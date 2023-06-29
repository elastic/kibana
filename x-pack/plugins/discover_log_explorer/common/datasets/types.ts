/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { indexPatternRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';

export const datasetRT = rt.exact(
  rt.intersection([
    rt.type({
      name: indexPatternRt,
    }),
    rt.partial({
      title: rt.string,
    }),
  ])
);

const integrationStatusRT = rt.keyof({
  installed: null,
  installing: null,
  install_failed: null,
});

export const integrationRT = rt.type({
  name: rt.string,
  status: integrationStatusRT,
  version: rt.string,
  dataStreams: rt.array(datasetRT),
});

export type DatasetId = `dataset-${string}`;
export type IntegrationId = `integration-${string}-${string}`;

export type DatasetType = rt.TypeOf<typeof datasetRT>;
export type IntegrationType = rt.TypeOf<typeof integrationRT>;
