/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dataset } from '../datasets';
import { DataSourceSelectionStrategy } from './types';

const SELECTION_TYPE = 'all' as const;

export class AllDatasetSelection implements DataSourceSelectionStrategy {
  selectionType: typeof SELECTION_TYPE;
  selection: {
    dataset: Dataset;
  };

  private constructor({ indices }: { indices: string }) {
    this.selectionType = SELECTION_TYPE;
    this.selection = {
      dataset: Dataset.createAllLogsDataset({ indices }),
    };
  }

  toDataviewSpec() {
    return this.selection.dataset.toDataviewSpec();
  }

  toPlainSelection() {
    return {
      selectionType: this.selectionType,
    };
  }
  public static getLocatorPlainSelection() {
    return {
      selectionType: SELECTION_TYPE,
    };
  }

  public static create({ indices }: { indices: string }) {
    return new AllDatasetSelection({ indices });
  }
}
