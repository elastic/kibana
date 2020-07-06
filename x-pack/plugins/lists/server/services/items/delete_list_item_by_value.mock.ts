/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getCallClusterMock } from '../../../common/get_call_cluster.mock';
import { DeleteListItemByValueOptions } from '../items';
import { LIST_ID, LIST_ITEM_INDEX, TYPE, VALUE } from '../../../common/constants.mock';

export const getDeleteListItemByValueOptionsMock = (): DeleteListItemByValueOptions => ({
  callCluster: getCallClusterMock(),
  listId: LIST_ID,
  listItemIndex: LIST_ITEM_INDEX,
  type: TYPE,
  value: VALUE,
});
