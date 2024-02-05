/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExplorerDataView } from '../data_views/models/explorer_data_view';
import { DatasetSelectionStrategy, ExplorerDataViewSelectionPayload } from './types';

export class ExplorerDataViewSelection implements DatasetSelectionStrategy {
  selectionType: 'dataView';
  selection: {
    dataView: ExplorerDataView;
  };

  private constructor(explorerDataView: ExplorerDataView) {
    this.selectionType = 'dataView';
    this.selection = {
      dataView: explorerDataView,
    };
  }

  toDataviewSpec() {
    return this.selection.dataView.toDataviewSpec();
  }

  toPlainSelection() {
    return {
      selectionType: this.selectionType,
      selection: {
        dataView: this.selection.dataView.toPlain(),
      },
    };
  }

  public static fromSelection(selection: ExplorerDataViewSelectionPayload) {
    const { dataView } = selection;

    const explorerDataView = ExplorerDataView.create(dataView);
    return ExplorerDataViewSelection.create(explorerDataView);
  }

  public static create(explorerDataView: ExplorerDataView) {
    return new ExplorerDataViewSelection(explorerDataView);
  }
}
