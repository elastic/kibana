/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line max-classes-per-file
import * as rt from 'io-ts';
import * as lz from 'lz-string';
import { encode, decode, RisonValue } from '@kbn/rison';
import { DataViewSpec } from '@kbn/data-views-plugin/common';
import { decodeOrThrow } from '../../common/runtime_types';
import { Dataset, datasetRT } from '../../common/datasets';

export const allDatasetSelectionPlainRT = rt.type({
  selectionType: rt.literal('all'),
});

const integrationNameRT = rt.partial({
  name: rt.string,
});

const integrationVersionRT = rt.partial({
  version: rt.string,
});

const singleDatasetSelectionPayloadRT = rt.intersection([
  integrationNameRT,
  integrationVersionRT,
  rt.type({
    dataset: datasetRT,
  }),
]);

export const singleDatasetSelectionPlainRT = rt.type({
  selectionType: rt.literal('single'),
  selection: singleDatasetSelectionPayloadRT,
});

const datasetSelectionPlainRT = rt.union([
  allDatasetSelectionPlainRT,
  singleDatasetSelectionPlainRT,
]);

export type SingleDatasetSelectionPayload = rt.TypeOf<typeof singleDatasetSelectionPayloadRT>;
export type DatasetSelectionPlain = rt.TypeOf<typeof datasetSelectionPlainRT>;

export const encodeDatasetSelection = (datasetSelectionPlain: DatasetSelectionPlain) => {
  const safeDatasetSelection = decodeOrThrow(
    datasetSelectionPlainRT,
    (message: string) =>
      new DatasetCompressionError(`The current dataset selection is invalid: ${message}"`)
  )(datasetSelectionPlain);

  return lz.compressToBase64(encode(safeDatasetSelection));
};

export type DatasetSelection = AllDatasetSelection | SingleDatasetSelection;

export const decodeDatasetSelectionId = (datasetSelectionId: string) => {
  const risonDatasetSelection: RisonValue = lz.decompressFromBase64(datasetSelectionId);

  if (risonDatasetSelection === null) {
    throw new DatasetCompressionError('The stored id is not a valid compressed value.');
  }

  const decodedDatasetSelection = decode(risonDatasetSelection);

  const datasetSelection = decodeOrThrow(
    datasetSelectionPlainRT,
    (message: string) =>
      new DatasetCompressionError(`The current dataset selection is invalid: ${message}"`)
  )(decodedDatasetSelection);

  if (datasetSelection.selectionType === 'all') {
    return AllDatasetSelection.create();
  }
  if (datasetSelection.selectionType === 'single') {
    return SingleDatasetSelection.fromSelection(datasetSelection.selection);
  }
};

export class DatasetCompressionError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'DatasetCompressionError';
  }
}

interface DatasetSelectionHandlers {
  toDataviewSpec(): DataViewSpec;
  toURLSelectionId(): string;
}

export class SingleDatasetSelection implements DatasetSelectionHandlers {
  selectionType: 'single';
  selection: {
    name?: string;
    version?: string;
    dataset: Dataset;
  };

  private constructor(dataset: Dataset) {
    this.selectionType = 'single';
    this.selection = {
      name: dataset.parentIntegration?.name,
      version: dataset.parentIntegration?.version,
      dataset,
    };
  }

  toDataviewSpec() {
    const { name, title } = this.selection.dataset.toDataviewSpec();
    return {
      id: this.toURLSelectionId(),
      name,
      title,
    };
  }

  toURLSelectionId() {
    return encodeDatasetSelection({
      selectionType: this.selectionType,
      selection: {
        name: this.selection.name,
        version: this.selection.version,
        dataset: this.selection.dataset.toPlain(),
      },
    });
  }

  public static fromSelection(selection: SingleDatasetSelectionPayload) {
    const { name, version, dataset } = selection;

    // Attempt reconstructing the integration object
    const integration = name && version ? { name, version } : undefined;
    const datasetInstance = Dataset.create(dataset, integration);

    return new SingleDatasetSelection(datasetInstance);
  }

  public static create(dataset: Dataset) {
    return new SingleDatasetSelection(dataset);
  }
}

export class AllDatasetSelection implements DatasetSelectionHandlers {
  selectionType: 'all';
  selection: {
    dataset: Dataset;
  };

  private constructor() {
    this.selectionType = 'all';
    this.selection = {
      dataset: Dataset.createAllLogsDataset(),
    };
  }

  toDataviewSpec() {
    const { name, title } = this.selection.dataset.toDataviewSpec();
    return {
      id: this.toURLSelectionId(),
      name,
      title,
    };
  }

  toURLSelectionId() {
    return encodeDatasetSelection({
      selectionType: this.selectionType,
    });
  }

  public static create() {
    return new AllDatasetSelection();
  }
}
