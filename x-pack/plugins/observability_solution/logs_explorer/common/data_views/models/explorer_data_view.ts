/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewListItem } from '@kbn/data-views-plugin/common';
import { TIMESTAMP_FIELD } from '../../constants';
import { DataViewSpecWithId } from '../../dataset_selection';
import { ExplorerDataViewType } from '../types';
import { buildIndexPatternRegExp } from '../utils';

type Whitelist = Array<string | RegExp>;

const LOGS_WHITELIST: Whitelist = [
  buildIndexPatternRegExp(['logs', 'auditbeat', 'filebeat', 'winbeat']),
  // Add more strings or regex patterns as needed
];

export class ExplorerDataView {
  id: ExplorerDataViewType['id'];
  dataType: ExplorerDataViewType['dataType'];
  name: ExplorerDataViewType['name'];
  namespaces: ExplorerDataViewType['namespaces'];
  title: ExplorerDataViewType['title'];
  type: ExplorerDataViewType['type'];

  private constructor(explorerDataView: ExplorerDataViewType) {
    this.id = explorerDataView.id;
    this.dataType = explorerDataView.dataType;
    this.name = explorerDataView.name;
    this.namespaces = explorerDataView.namespaces;
    this.title = explorerDataView.title;
    this.type = explorerDataView.type;
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
      id: this.id,
      dataType: this.dataType,
      name: this.name,
      title: this.title,
    };
  }

  public static create(dataViewListItem: DataViewListItem) {
    const name = dataViewListItem.name ?? dataViewListItem.title;
    const dataType = ExplorerDataView.#extractDataType(dataViewListItem.title);

    return new ExplorerDataView({ ...dataViewListItem, dataType, name });
  }

  static #extractDataType(title: string): ExplorerDataViewType['dataType'] {
    if (testAgainstWhitelist(title, LOGS_WHITELIST)) {
      return 'logs';
    }

    return 'unknown';
  }

  public isLogDataType() {
    return this.dataType === 'logs';
  }

  public isUnknownDataType() {
    return this.dataType === 'unknown';
  }
}

function testAgainstWhitelist(value: string, whitelist: Whitelist) {
  for (const allowedItem of whitelist) {
    if (typeof allowedItem === 'string') {
      return value === allowedItem;
    }
    if (allowedItem instanceof RegExp) {
      return allowedItem.test(value);
    }
  }

  // If no match is found in the whitelist, return false
  return false;
}
