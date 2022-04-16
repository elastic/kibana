/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '@kbn/core/server/elasticsearch/client/mocks';

import { LIST_ID, LIST_ITEM_INDEX, TYPE, VALUE } from '../../../common/constants.mock';

import { DeleteListItemByValueOptions } from '.';

export const getDeleteListItemByValueOptionsMock = (): DeleteListItemByValueOptions => ({
  esClient: elasticsearchClientMock.createScopedClusterClient().asCurrentUser,
  listId: LIST_ID,
  listItemIndex: LIST_ITEM_INDEX,
  type: TYPE,
  value: VALUE,
});
