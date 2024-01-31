/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewListItem } from '@kbn/data-views-plugin/common';
import { TIMESTAMP_FIELD } from '../../constants';
import { DataViewSpecWithId } from '../../dataset_selection';
import { ExplorerDataViewId, ExplorerDataViewType } from '../types';

export class ExplorerDataView {
  id: ExplorerDataViewId;
  dataType: ExplorerDataViewType['dataType'];
  name: ExplorerDataViewType['name'];
  namespaces: ExplorerDataViewType['namespaces'];
  title: ExplorerDataViewType['title'];
  type: ExplorerDataViewType['type'];

  private constructor(explorerDataView: DataViewListItem) {
    this.id = `explorer-dataview-${explorerDataView.id}`;
    this.name = explorerDataView.name;
    this.namespaces = explorerDataView.namespaces;
    this.title = explorerDataView.title;
    this.type = explorerDataView.type;

    this.dataType = this.extractDataType();
  }

  getFullTitle() {
    return this.name;
  }

  toDataviewSpec(): DataViewSpecWithId {
    return {
      id: this.id,
      name: this.name,
      timeFieldName: TIMESTAMP_FIELD,
      title: this.title,
    };
  }

  toPlain() {
    return {
      name: this.name,
      title: this.title,
    };
  }

  public static create(dataViewListItem: DataViewListItem) {
    const name = dataViewListItem.name ?? dataViewListItem.title;

    return new ExplorerDataView({ ...dataViewListItem, name });
  }

  public extractDataType(): ExplorerDataViewType['dataType'] {
    if (this.isLogDataType()) {
      return 'logs';
    }

    return 'unknown';
  }

  public isLogDataType() {
    // TODO: improve logic and whitelist
    if (this.title.startsWith('logs-')) return true;

    return false;
  }
}
