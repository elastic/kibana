/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsTaggingApiUi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { tagsCacheMock } from '../services/tags/tags_cache.mock';
import { createTag } from '../../common/test_utils';
import { buildParseSearchQuery } from './parse_search_query';

const tagRef = (id: string) => ({
  id,
  type: 'tag',
});

const tags = [
  createTag({ id: 'id-1', name: 'name-1' }),
  createTag({ id: 'id-2', name: 'name-2' }),
  createTag({ id: 'id-3', name: 'name-3' }),
];

describe('parseSearchQuery', () => {
  let cache: ReturnType<typeof tagsCacheMock.create>;
  let parseSearchQuery: SavedObjectsTaggingApiUi['parseSearchQuery'];

  beforeEach(() => {
    cache = tagsCacheMock.create();
    cache.getState.mockReturnValue(tags);

    parseSearchQuery = buildParseSearchQuery({ cache });
  });

  it('returns the search term when there is no field clause', () => {
    const searchTerm = 'my search term';

    expect(parseSearchQuery(searchTerm)).toEqual({
      searchTerm,
      tagReferences: [],
      valid: true,
    });
  });

  it('returns the raw search term when the syntax is not valid', () => {
    const searchTerm = 'tag:id-1 [search term]';

    expect(parseSearchQuery(searchTerm)).toEqual({
      searchTerm,
      tagReferences: [],
      valid: false,
    });
  });

  it('returns the tag references matching the tag field clause when using `useName: false`', () => {
    const searchTerm = 'tag:(id-1 OR id-2) my search term';

    expect(parseSearchQuery(searchTerm, { useName: false })).toEqual({
      searchTerm: 'my search term',
      tagReferences: [tagRef('id-1'), tagRef('id-2')],
      valid: true,
    });
  });

  it('returns the tag references matching the tag field clause when using `useName: true`', () => {
    const searchTerm = 'tag:(name-1 OR name-2) my search term';

    expect(parseSearchQuery(searchTerm, { useName: true })).toEqual({
      searchTerm: 'my search term',
      tagReferences: [tagRef('id-1'), tagRef('id-2')],
      valid: true,
    });
  });

  it('uses the `tagField` option', () => {
    const searchTerm = 'custom:(name-1 OR name-2) my search term';

    expect(parseSearchQuery(searchTerm, { tagField: 'custom' })).toEqual({
      searchTerm: 'my search term',
      tagReferences: [tagRef('id-1'), tagRef('id-2')],
      valid: true,
    });
  });

  it('ignores names not in the cache', () => {
    const searchTerm = 'tag:(name-1 OR missing-name) my search term';

    expect(parseSearchQuery(searchTerm, { useName: true })).toEqual({
      searchTerm: 'my search term',
      tagReferences: [tagRef('id-1')],
      valid: true,
    });
  });
});
