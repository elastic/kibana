/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewListItem } from '@kbn/data-views-plugin/common';

export const parseDataViewListItem = (dataViewListItem: DataViewListItem) => {
  return {
    ...dataViewListItem,
    name: dataViewListItem.name ?? dataViewListItem.title,
  };
};
