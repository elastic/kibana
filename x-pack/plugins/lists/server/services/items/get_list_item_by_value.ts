/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ListItemArraySchema, Type } from '../../../common/schemas';
import { DataClient } from '../../types';

import { getListItemByValues } from '.';

export interface GetListItemByValueOptions {
  listId: string;
  dataClient: DataClient;
  listItemIndex: string;
  type: Type;
  value: string;
}

export const getListItemByValue = async ({
  listId,
  dataClient,
  listItemIndex,
  type,
  value,
}: GetListItemByValueOptions): Promise<ListItemArraySchema> =>
  getListItemByValues({
    dataClient,
    listId,
    listItemIndex,
    type,
    value: [value],
  });
