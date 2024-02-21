/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { Tag, TagAttributes } from '../../../common/types';
import { TagsCache, CacheRefreshHandler } from './tags_cache';

const createTag = (parts: Partial<Tag>): Tag => ({
  id: 'tag-id',
  name: 'some-tag',
  description: 'Some tag',
  color: '#FF00CC',
  managed: false,
  ...parts,
});

const createAttributes = (parts: Partial<TagAttributes>): TagAttributes => ({
  name: 'some-tag',
  description: 'Some tag',
  color: '#FF00CC',
  ...parts,
});

const createTags = (ids: string[]): Tag[] =>
  ids.map((id) =>
    createTag({
      id,
      name: `${id}-name`,
      description: `${id}-desc`,
      color: '#FF00CC',
    })
  );

const refreshHandler: CacheRefreshHandler = () => createTags(['tag-1', 'tag-2', 'tag-3']);

describe('TagsCache', () => {
  let tagsCache: TagsCache;

  beforeEach(async () => {
    tagsCache = new TagsCache({
      refreshHandler,
    });
    await tagsCache.initialize();
  });

  describe('#onDelete', () => {
    it('removes the deleted tag from the cache', async () => {
      tagsCache.onDelete('tag-1');

      expect(tagsCache.getState().map((tag) => tag.id)).toEqual(['tag-2', 'tag-3']);
    });

    it('does nothing if the specified id is not in the cache', async () => {
      tagsCache.onDelete('tag-4');

      expect(tagsCache.getState().map((tag) => tag.id)).toEqual(['tag-1', 'tag-2', 'tag-3']);
    });
  });

  describe('#onCreate', () => {
    it('adds the new tag to the cache', async () => {
      const newTag = createTag({ id: 'new-tag' });
      tagsCache.onCreate(newTag);

      expect(tagsCache.getState().map((tag) => tag.id)).toEqual([
        'tag-1',
        'tag-2',
        'tag-3',
        'new-tag',
      ]);
    });

    it('replace the entry from the cache if already existing', async () => {
      const newTag = createTag({ id: 'tag-2', name: 'new-tag' });
      tagsCache.onCreate(newTag);

      const cacheState = tagsCache.getState();
      expect(cacheState.map((tag) => tag.id)).toEqual(['tag-1', 'tag-3', 'tag-2']);
      expect(cacheState[2]).toEqual(newTag);
    });
  });

  describe('#onUpdate', () => {
    it('replace the entry from the cache', async () => {
      const updatedAttributes = createAttributes({ name: 'updated-name' });
      tagsCache.onUpdate('tag-2', updatedAttributes);

      const cacheState = tagsCache.getState();
      expect(cacheState.map((tag) => tag.id)).toEqual(['tag-1', 'tag-2', 'tag-3']);
      expect(cacheState[1]).toEqual({
        id: 'tag-2',
        managed: false,
        ...updatedAttributes,
      });
    });
  });

  describe('#onGetAll', () => {
    it('refreshes the cache with the new list', () => {
      const newTags = createTags(['tag-1', 'tag-4', 'tag-5']);

      tagsCache.onGetAll(newTags);

      expect(tagsCache.getState()).toEqual(newTags);
    });
  });

  describe('when `refreshInterval` is provided', () => {
    const refreshInterval = moment.duration('15s');

    let setIntervalSpy: jest.SpyInstance;
    let clearIntervalSpy: jest.SpyInstance;

    beforeEach(async () => {
      tagsCache = new TagsCache({
        refreshHandler,
        refreshInterval,
      });
      setIntervalSpy = jest.spyOn(window, 'setInterval');
      clearIntervalSpy = jest.spyOn(window, 'clearInterval');
    });

    it('calls `setInterval` during `initialize` with correct parameters', async () => {
      await tagsCache.initialize();

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        refreshInterval.asMilliseconds()
      );
    });

    it('calls `clearInterval` during `stop` with correct parameters', async () => {
      const intervalId = 42;
      setIntervalSpy.mockReturnValue(intervalId);

      await tagsCache.initialize();
      tagsCache.stop();

      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
      expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
    });
  });
});
