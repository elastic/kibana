/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DataViewSpec } from '@kbn/data-views-plugin/common';
import * as rt from 'io-ts';
import { datasetRT } from '../../../common/datasets';

export const allDatasetSelectionPlainRT = rt.type({
  selectionType: rt.literal('all'),
});

const integrationNameRT = rt.partial({
  name: rt.string,
});

const integrationTitleRT = rt.partial({
  title: rt.string,
});

const integrationVersionRT = rt.partial({
  version: rt.string,
});

const singleDatasetSelectionPayloadRT = rt.intersection([
  integrationNameRT,
  integrationTitleRT,
  integrationVersionRT,
  rt.type({
    dataset: datasetRT,
  }),
]);

export const singleDatasetSelectionPlainRT = rt.type({
  selectionType: rt.literal('single'),
  selection: singleDatasetSelectionPayloadRT,
});

export const datasetSelectionPlainRT = rt.union([
  allDatasetSelectionPlainRT,
  singleDatasetSelectionPlainRT,
]);

export type SingleDatasetSelectionPayload = rt.TypeOf<typeof singleDatasetSelectionPayloadRT>;
export type DatasetSelectionPlain = rt.TypeOf<typeof datasetSelectionPlainRT>;

export interface DatasetSelectionStrategy {
  toDataviewSpec(): DataViewSpec;
  toURLSelectionId(): string;
}
