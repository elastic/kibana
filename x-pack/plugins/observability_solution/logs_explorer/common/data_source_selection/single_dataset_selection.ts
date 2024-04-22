/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dataset } from '../datasets';
import { DataSourceSelectionStrategy, SingleDatasetSelectionPayload } from './types';

export class SingleDatasetSelection implements DataSourceSelectionStrategy {
  selectionType: 'single';
  selection: {
    name?: string;
    title?: string;
    version?: string;
    dataset: Dataset;
  };

  private constructor(dataset: Dataset) {
    this.selectionType = 'single';
    this.selection = {
      name: dataset.parentIntegration?.name,
      title: dataset.parentIntegration?.title,
      version: dataset.parentIntegration?.version,
      dataset,
    };
  }

  toDataviewSpec() {
    return this.selection.dataset.toDataviewSpec();
  }

  toPlainSelection() {
    return {
      selectionType: this.selectionType,
      selection: {
        name: this.selection.name,
        title: this.selection.title,
        version: this.selection.version,
        dataset: this.selection.dataset.toPlain(),
      },
    };
  }

  public static fromSelection(selection: SingleDatasetSelectionPayload) {
    const { name, title, version, dataset } = selection;

    // Attempt reconstructing the integration object
    const integration = name && version ? { name, title, version } : undefined;
    const datasetInstance = Dataset.create(dataset, integration);

    return SingleDatasetSelection.create(datasetInstance);
  }

  public static create(dataset: Dataset) {
    return new SingleDatasetSelection(dataset);
  }
}
