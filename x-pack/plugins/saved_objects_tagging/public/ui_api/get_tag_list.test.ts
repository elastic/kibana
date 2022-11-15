/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createTag } from '../../common/test_utils';
import { tagsCacheMock } from '../services/tags/tags_cache.mock';
import { buildGetTagList } from './get_tag_list';

describe('getTagList', () => {
  it('sorts the tags by name', async () => {
    const tag1 = createTag({ id: 'id-1', name: 'aaa' });
    const tag2 = createTag({ id: 'id-2', name: 'ccc' });
    const tag3 = createTag({ id: 'id-3', name: 'bbb' });

    const cache = tagsCacheMock.create();
    cache.getState.mockReturnValue([tag1, tag2, tag3]);

    const getTagList = buildGetTagList(cache);

    const tags = getTagList();
    expect(tags).toEqual([tag1, tag3, tag2]);
  });
});
