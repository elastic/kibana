/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsTaggingApiUi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { taggingApiMock } from '@kbn/saved-objects-tagging-oss-plugin/public/mocks';
import { tagsCacheMock } from '../services/tags/tags_cache.mock';
import { createTagReference, createSavedObject, createTag } from '../../common/test_utils';
import { buildGetTableColumnDefinition } from './get_table_column_definition';

describe('getTableColumnDefinition', () => {
  let cache: ReturnType<typeof tagsCacheMock.create>;
  let components: ReturnType<typeof taggingApiMock.createComponents>;
  let getTableColumnDefinition: SavedObjectsTaggingApiUi['getTableColumnDefinition'];

  beforeEach(() => {
    cache = tagsCacheMock.create();
    components = taggingApiMock.createComponents();

    getTableColumnDefinition = buildGetTableColumnDefinition({
      cache,
      components,
    });
  });

  it('returns a valid definition for a EUI field data column', () => {
    const tableDef = getTableColumnDefinition();

    expect(tableDef).toEqual(
      expect.objectContaining({
        field: 'references',
        name: expect.any(String),
        description: expect.any(String),
        sortable: expect.any(Function),
        render: expect.any(Function),
      })
    );
  });

  it('returns the correct sorting value', () => {
    const allTags = [
      createTag({ id: 'tag-1', name: 'Tag 1' }),
      createTag({ id: 'tag-2', name: 'Tag 2' }),
      createTag({ id: 'tag-3', name: 'Tag 3' }),
    ];
    cache.getState.mockReturnValue(allTags);

    const tagReferences = [createTagReference('tag-3'), createTagReference('tag-1')];

    const savedObject = createSavedObject({
      references: tagReferences,
    });

    const { sortable } = getTableColumnDefinition();

    // we know this returns a function even if the generic column signature allows other types
    expect((sortable as Function)(savedObject)).toEqual('Tag 1');
  });
});
