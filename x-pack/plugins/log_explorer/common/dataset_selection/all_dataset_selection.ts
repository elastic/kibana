/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewSpec } from '@kbn/data-views-plugin/common';
import { Dataset } from '../datasets';
import { DatasetSelectionStrategy } from './types';

export class AllDatasetSelection implements DatasetSelectionStrategy {
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

  toDataviewSpec(): DataViewSpec {
    return this.selection.dataset.toDataviewSpec();
  }

  toPlainSelection() {
    return {
      selectionType: this.selectionType,
    };
  }

  public static create() {
    return new AllDatasetSelection();
  }
}
