/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/public';
import { DatasetSelectionStrategy, DataViewSelectionPayload } from './types';

export class DataViewSelection implements DatasetSelectionStrategy {
  selectionType: 'dataView';
  selection: {
    dataView: DataView;
  };

  private constructor(dataView: DataView) {
    this.selectionType = 'dataView';
    this.selection = {
      dataView,
    };
  }

  toDataviewSpec() {
    // TODO
    return this.selection.dataView.toSpec();
  }

  toPlainSelection() {
    return {
      selectionType: this.selectionType,
      selection: {
        dataView: {
          id: this.selection.dataView.id,
        },
      },
    };
  }

  public static fromSelection(selection: DataViewSelectionPayload) {
    const { dataView } = selection;

    // Attempt reconstructing the integration object
    // const integration = name && version ? { name, title, version } : undefined;
    // const datasetInstance = Dataset.create(dataset, integration);
    // TODO: fix logic for data view creation
    return new DataViewSelection(dataView);
  }

  public static create(dataView: DataView) {
    return new DataViewSelection(dataView);
  }
}
