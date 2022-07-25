/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import { LIST_ITEM_ID, LIST_ITEM_INDEX } from '../../../common/constants.mock';

import { DeleteListItemOptions } from '.';

export const getDeleteListItemOptionsMock = (): DeleteListItemOptions => ({
  esClient: elasticsearchClientMock.createScopedClusterClient().asCurrentUser,
  id: LIST_ITEM_ID,
  listItemIndex: LIST_ITEM_INDEX,
});
