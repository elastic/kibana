/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dataset } from '../datasets';
import { DataSourceSelectionStrategy, UnresolvedDatasetSelectionPayload } from './types';

export class UnresolvedDatasetSelection implements DataSourceSelectionStrategy {
  selectionType: 'unresolved';
  selection: {
    name?: string;
    dataset: Dataset;
  };

  private constructor(dataset: Dataset) {
    this.selectionType = 'unresolved';
    this.selection = {
      name: dataset.parentIntegration?.name,
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
        dataset: this.selection.dataset.toPlain(),
      },
    };
  }

  public static fromSelection(selection: UnresolvedDatasetSelectionPayload) {
    const { name, dataset } = selection;

    // Attempt reconstructing the integration object
    const integration = name ? { name } : undefined;
    const datasetInstance = Dataset.create(dataset, integration);

    return new UnresolvedDatasetSelection(datasetInstance);
  }

  public static create(dataset: Dataset) {
    return new UnresolvedDatasetSelection(dataset);
  }
}
