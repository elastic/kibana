/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsTaggingApiUi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { tagsCacheMock } from '../services/tags/tags_cache.mock';
import { Tag } from '../../common/types';
import { createTag } from '../../common/test_utils';
import { buildGetSearchBarFilter } from './get_search_bar_filter';

const expectTagOption = (tag: Tag, useName: boolean) => ({
  value: useName ? tag.name : tag.id,
  name: tag.name,
  view: expect.anything(),
});

describe('getSearchBarFilter', () => {
  let cache: ReturnType<typeof tagsCacheMock.create>;
  let getSearchBarFilter: SavedObjectsTaggingApiUi['getSearchBarFilter'];

  beforeEach(() => {
    cache = tagsCacheMock.create();
    getSearchBarFilter = buildGetSearchBarFilter({ cache });
  });

  it('has the correct base configuration', () => {
    expect(getSearchBarFilter()).toEqual({
      type: 'field_value_selection',
      field: 'tag',
      name: expect.any(String),
      multiSelect: 'or',
      options: expect.any(Function),
    });
  });

  it('uses the specified field', () => {
    expect(getSearchBarFilter({ tagField: 'foo' })).toEqual(
      expect.objectContaining({
        field: 'foo',
      })
    );
  });

  it('resolves the options', async () => {
    const tags = [
      createTag({ id: 'id-1', name: 'name-1' }),
      createTag({ id: 'id-2', name: 'name-2' }),
      createTag({ id: 'id-3', name: 'name-3' }),
    ];
    cache.getState.mockReturnValue(tags);

    // EUI types for filters are incomplete
    const { options } = getSearchBarFilter() as any;

    const fetched = await options();
    expect(fetched).toEqual(tags.map((tag) => expectTagOption(tag, true)));
  });

  it('sorts the tags by name', async () => {
    const tag1 = createTag({ id: 'id-1', name: 'aaa' });
    const tag2 = createTag({ id: 'id-2', name: 'ccc' });
    const tag3 = createTag({ id: 'id-3', name: 'bbb' });

    cache.getState.mockReturnValue([tag1, tag2, tag3]);

    // EUI types for filters are incomplete
    const { options } = getSearchBarFilter() as any;

    const fetched = await options();
    expect(fetched).toEqual([tag1, tag3, tag2].map((tag) => expectTagOption(tag, true)));
  });

  it('uses the `useName` option', async () => {
    const tags = [
      createTag({ id: 'id-1', name: 'name-1' }),
      createTag({ id: 'id-2', name: 'name-2' }),
      createTag({ id: 'id-3', name: 'name-3' }),
    ];
    cache.getState.mockReturnValue(tags);

    // EUI types for filters are incomplete
    const { options } = getSearchBarFilter({ useName: false }) as any;

    const fetched = await options();
    expect(fetched).toEqual(tags.map((tag) => expectTagOption(tag, false)));
  });
});
