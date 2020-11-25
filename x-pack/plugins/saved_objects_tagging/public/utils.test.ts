/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectReference } from 'src/core/types';
import {
  getObjectTags,
  convertTagNameToId,
  byNameTagSorter,
  updateTagsReferences,
  getTagIdsFromReferences,
  tagIdToReference,
} from './utils';

const createTag = (id: string, name: string = id) => ({
  id,
  name,
  description: `desc ${id}`,
  color: '#FFCC00',
});

const ref = (type: string, id: string): SavedObjectReference => ({
  id,
  type,
  name: `${type}-ref-${id}`,
});

const tagRef = (id: string) => ref('tag', id);

const createObject = (refs: SavedObjectReference[]): SavedObject => {
  return {
    type: 'unkown',
    id: 'irrelevant',
    references: refs,
  } as SavedObject;
};

const tag1 = createTag('id-1', 'name-1');
const tag2 = createTag('id-2', 'name-2');
const tag3 = createTag('id-3', 'name-3');

const allTags = [tag1, tag2, tag3];

describe('getObjectTags', () => {
  it('returns the tags for the tag references of the object', () => {
    const { tags } = getObjectTags(
      createObject([tagRef('id-1'), ref('dashboard', 'dash-1'), tagRef('id-3')]),
      allTags
    );

    expect(tags).toEqual([tag1, tag3]);
  });

  it('returns the missing references for tags that were not found', () => {
    const missingRef = tagRef('missing-tag');
    const refs = [tagRef('id-1'), ref('dashboard', 'dash-1'), missingRef];
    const { tags, missingRefs } = getObjectTags(createObject(refs), allTags);

    expect(tags).toEqual([tag1]);
    expect(missingRefs).toEqual([missingRef]);
  });
});

describe('convertTagNameToId', () => {
  it('returns the id for the given tag name', () => {
    expect(convertTagNameToId('name-2', allTags)).toBe('id-2');
  });

  it('returns undefined if no tag was found', () => {
    expect(convertTagNameToId('name-4', allTags)).toBeUndefined();
  });
});

describe('byNameTagSorter', () => {
  it('sorts tags by name', () => {
    const tags = [
      createTag('id-1', 'tag-b'),
      createTag('id-2', 'tag-a'),
      createTag('id-3', 'tag-d'),
      createTag('id-4', 'tag-c'),
    ];

    tags.sort(byNameTagSorter);

    expect(tags.map(({ id }) => id)).toEqual(['id-2', 'id-1', 'id-4', 'id-3']);
  });
});

describe('tagIdToReference', () => {
  it('returns a reference for given tag id', () => {
    expect(tagIdToReference('some-tag-id')).toEqual({
      id: 'some-tag-id',
      type: 'tag',
      name: 'tag-ref-some-tag-id',
    });
  });
});

describe('getTagIdsFromReferences', () => {
  it('returns the tag ids from the given references', () => {
    expect(
      getTagIdsFromReferences([
        tagRef('tag-1'),
        ref('dashboard', 'dash-1'),
        tagRef('tag-2'),
        ref('lens', 'lens-1'),
      ])
    ).toEqual(['tag-1', 'tag-2']);
  });
});

describe('updateTagsReferences', () => {
  it('updates the tag references', () => {
    expect(
      updateTagsReferences([tagRef('tag-1'), tagRef('tag-2'), tagRef('tag-3')], ['tag-2', 'tag-4'])
    ).toEqual([tagRef('tag-2'), tagRef('tag-4')]);
  });
  it('leaves the non-tag references unchanged', () => {
    expect(
      updateTagsReferences(
        [ref('dashboard', 'dash-1'), tagRef('tag-1'), ref('lens', 'lens-1'), tagRef('tag-2')],
        ['tag-2', 'tag-4']
      )
    ).toEqual([
      ref('dashboard', 'dash-1'),
      ref('lens', 'lens-1'),
      tagRef('tag-2'),
      tagRef('tag-4'),
    ]);
  });
});
