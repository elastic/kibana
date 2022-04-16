/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taggingApiMock } from '@kbn/saved-objects-tagging-plugin/public/mocks';
import { Tag } from '@kbn/saved-objects-tagging-oss-plugin/common';
import { getSuggestions } from './get_suggestions';

const createTag = (parts: Partial<Tag> = {}): Tag => ({
  id: 'tag-id',
  name: 'some-tag',
  description: 'Some tag',
  color: '#FF00CC',
  ...parts,
});

describe('getSuggestions', () => {
  let tagCache: ReturnType<typeof taggingApiMock.createCache>;
  const searchableTypes = ['application', 'dashboard', 'maps'];

  beforeEach(() => {
    tagCache = taggingApiMock.createCache();

    tagCache.getState.mockReturnValue([
      createTag({
        id: 'basic',
        name: 'normal',
      }),
      createTag({
        id: 'caps',
        name: 'BAR',
      }),
      createTag({
        id: 'whitespace',
        name: 'white space',
      }),
    ]);
  });

  describe('tag suggestion', () => {
    it('returns a suggestion when matching the name of a tag', () => {
      const suggestions = getSuggestions({
        searchTerm: 'normal',
        tagCache,
        searchableTypes: [],
      });

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toEqual(
        expect.objectContaining({
          label: 'tag: normal',
          suggestedSearch: 'tag:normal',
        })
      );
    });
    it('ignores leading or trailing spaces a suggestion when matching the name of a tag', () => {
      const suggestions = getSuggestions({
        searchTerm: ' normal ',
        tagCache,
        searchableTypes: [],
      });

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toEqual(
        expect.objectContaining({
          label: 'tag: normal',
          suggestedSearch: 'tag:normal',
        })
      );
    });
    it('does not return suggestions when partially matching', () => {
      const suggestions = getSuggestions({
        searchTerm: 'norm',
        tagCache,
        searchableTypes: [],
      });

      expect(suggestions).toHaveLength(0);
    });
    it('ignores the case when matching the tag', () => {
      const suggestions = getSuggestions({
        searchTerm: 'baR',
        tagCache,
        searchableTypes: [],
      });

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toEqual(
        expect.objectContaining({
          label: 'tag: BAR',
          suggestedSearch: 'tag:BAR',
        })
      );
    });
    it('escapes the name in the query when containing whitespaces', () => {
      const suggestions = getSuggestions({
        searchTerm: 'white space',
        tagCache,
        searchableTypes: [],
      });

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toEqual(
        expect.objectContaining({
          label: 'tag: white space',
          suggestedSearch: 'tag:"white space"',
        })
      );
    });
  });

  describe('type suggestion', () => {
    it('returns a suggestion when matching a searchable type', () => {
      const suggestions = getSuggestions({
        searchTerm: 'application',
        tagCache,
        searchableTypes,
      });

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toEqual(
        expect.objectContaining({
          label: 'type: application',
          suggestedSearch: 'type:application',
        })
      );
    });
    it('ignores leading or trailing spaces in the search term', () => {
      const suggestions = getSuggestions({
        searchTerm: ' application ',
        tagCache,
        searchableTypes,
      });

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toEqual(
        expect.objectContaining({
          label: 'type: application',
          suggestedSearch: 'type:application',
        })
      );
    });
    it('does not return suggestions when partially matching', () => {
      const suggestions = getSuggestions({
        searchTerm: 'appl',
        tagCache,
        searchableTypes,
      });

      expect(suggestions).toHaveLength(0);
    });
    it('ignores the case when matching the type', () => {
      const suggestions = getSuggestions({
        searchTerm: 'DASHboard',
        tagCache,
        searchableTypes,
      });

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toEqual(
        expect.objectContaining({
          label: 'type: dashboard',
          suggestedSearch: 'type:dashboard',
        })
      );
    });
  });
});
