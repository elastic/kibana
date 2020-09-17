/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSearchListItemMock } from '../../../common/schemas/elastic_response/search_es_list_item_schema.mock';
import { getListItemResponseMock } from '../../../common/schemas/response/list_item_schema.mock';
import { ListItemArraySchema } from '../../../common/schemas';

import { transformElasticToListItem } from './transform_elastic_to_list_item';

describe('transform_elastic_to_list_item', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it transforms an elastic type to a list item type', () => {
    const response = getSearchListItemMock();
    const queryFilter = transformElasticToListItem({
      response,
      type: 'ip',
    });
    const expected: ListItemArraySchema = [getListItemResponseMock()];
    expect(queryFilter).toEqual(expected);
  });

  test('it transforms an elastic keyword type to a list item type', () => {
    const response = getSearchListItemMock();
    response.hits.hits[0]._source.ip = undefined;
    response.hits.hits[0]._source.keyword = 'host-name-example';
    const queryFilter = transformElasticToListItem({
      response,
      type: 'keyword',
    });
    const listItemResponse = getListItemResponseMock();
    listItemResponse.type = 'keyword';
    listItemResponse.value = 'host-name-example';
    const expected: ListItemArraySchema = [listItemResponse];
    expect(queryFilter).toEqual(expected);
  });
});
