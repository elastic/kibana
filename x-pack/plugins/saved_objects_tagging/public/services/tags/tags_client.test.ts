/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { Tag } from '../../../common/types';
import { createTag, createTagAttributes } from '../../../common/test_utils';
import { tagsCacheMock } from './tags_cache.mock';
import { TagsClient, FindTagsOptions } from './tags_client';

describe('TagsClient', () => {
  let tagsClient: TagsClient;
  let changeListener: ReturnType<typeof tagsCacheMock.create>;
  let http: ReturnType<typeof httpServiceMock.createSetupContract>;

  beforeEach(() => {
    http = httpServiceMock.createSetupContract();
    changeListener = tagsCacheMock.create();
    tagsClient = new TagsClient({
      http,
      changeListener,
    });
  });

  describe('#create', () => {
    let expectedTag: Tag;

    beforeEach(() => {
      expectedTag = createTag();
      http.post.mockResolvedValue({ tag: expectedTag });
    });

    it('calls `http.post` with the correct parameters', async () => {
      const attributes = createTagAttributes();

      await tagsClient.create(attributes);

      expect(http.post).toHaveBeenCalledTimes(1);
      expect(http.post).toHaveBeenCalledWith('/api/saved_objects_tagging/tags/create', {
        body: JSON.stringify(attributes),
      });
    });
    it('returns the tag object from the response', async () => {
      const tag = await tagsClient.create(createTagAttributes());
      expect(tag).toEqual(expectedTag);
    });
    it('forwards the error from the http call if any', async () => {
      const error = new Error('something when wrong');
      http.post.mockRejectedValue(error);

      await expect(tagsClient.create(createTagAttributes())).rejects.toThrowError(error);
    });
    it('notifies its changeListener if the http call succeed', async () => {
      await tagsClient.create(createTagAttributes());

      expect(changeListener.onCreate).toHaveBeenCalledTimes(1);
      expect(changeListener.onCreate).toHaveBeenCalledWith(expectedTag);
    });
    it('ignores potential errors when calling `changeListener.onCreate`', async () => {
      changeListener.onCreate.mockImplementation(() => {
        throw new Error('error in onCreate');
      });

      await expect(tagsClient.create(createTagAttributes())).resolves.toBeDefined();
    });
  });

  describe('#update', () => {
    const tagId = 'test-id';
    let expectedTag: Tag;

    beforeEach(() => {
      expectedTag = createTag({ id: tagId });
      http.post.mockResolvedValue({ tag: expectedTag });
    });

    it('calls `http.post` with the correct parameters', async () => {
      const attributes = createTagAttributes();

      await tagsClient.update(tagId, attributes);

      expect(http.post).toHaveBeenCalledTimes(1);
      expect(http.post).toHaveBeenCalledWith(`/api/saved_objects_tagging/tags/${tagId}`, {
        body: JSON.stringify(attributes),
      });
    });
    it('returns the tag object from the response', async () => {
      const tag = await tagsClient.update(tagId, createTagAttributes());
      expect(tag).toEqual(expectedTag);
    });
    it('forwards the error from the http call if any', async () => {
      const error = new Error('something when wrong');
      http.post.mockRejectedValue(error);

      await expect(tagsClient.update(tagId, createTagAttributes())).rejects.toThrowError(error);
    });
    it('notifies its changeListener if the http call succeed', async () => {
      await tagsClient.update(tagId, createTagAttributes());

      const { id, ...attributes } = expectedTag;
      expect(changeListener.onUpdate).toHaveBeenCalledTimes(1);
      expect(changeListener.onUpdate).toHaveBeenCalledWith(id, attributes);
    });
    it('ignores potential errors when calling `changeListener.onUpdate`', async () => {
      changeListener.onUpdate.mockImplementation(() => {
        throw new Error('error in onUpdate');
      });

      await expect(tagsClient.update(tagId, createTagAttributes())).resolves.toBeDefined();
    });
  });

  describe('#get', () => {
    const tagId = 'test-id';
    let expectedTag: Tag;

    beforeEach(() => {
      expectedTag = createTag({ id: tagId });
      http.get.mockResolvedValue({ tag: expectedTag });
    });

    it('calls `http.get` with the correct parameters', async () => {
      await tagsClient.get(tagId);

      expect(http.get).toHaveBeenCalledTimes(1);
      expect(http.get).toHaveBeenCalledWith(`/api/saved_objects_tagging/tags/${tagId}`);
    });
    it('returns the tag object from the response', async () => {
      const tag = await tagsClient.get(tagId);
      expect(tag).toEqual(expectedTag);
    });
    it('forwards the error from the http call if any', async () => {
      const error = new Error('something when wrong');
      http.get.mockRejectedValue(error);

      await expect(tagsClient.get(tagId)).rejects.toThrowError(error);
    });
  });

  describe('#getAll', () => {
    let expectedTags: Tag[];

    beforeEach(() => {
      expectedTags = [
        createTag({ id: 'tag-1' }),
        createTag({ id: 'tag-2' }),
        createTag({ id: 'tag-3' }),
      ];
      http.get.mockResolvedValue({ tags: expectedTags });
    });

    it('calls `http.get` with the correct parameters', async () => {
      await tagsClient.getAll();

      expect(http.get).toHaveBeenCalledTimes(1);
      expect(http.get).toHaveBeenCalledWith(`/api/saved_objects_tagging/tags`, {
        asSystemRequest: undefined,
      });
    });
    it('allows `asSystemRequest` option to be set', async () => {
      await tagsClient.getAll({ asSystemRequest: true });

      expect(http.get).toHaveBeenCalledTimes(1);
      expect(http.get).toHaveBeenCalledWith(`/api/saved_objects_tagging/tags`, {
        asSystemRequest: true,
      });
    });
    it('returns the tag objects from the response', async () => {
      const tags = await tagsClient.getAll();
      expect(tags).toEqual(expectedTags);
    });
    it('forwards the error from the http call if any', async () => {
      const error = new Error('something when wrong');
      http.get.mockRejectedValue(error);

      await expect(tagsClient.getAll()).rejects.toThrowError(error);
    });
    it('notifies its changeListener if the http call succeed', async () => {
      await tagsClient.getAll();

      expect(changeListener.onGetAll).toHaveBeenCalledTimes(1);
      expect(changeListener.onGetAll).toHaveBeenCalledWith(expectedTags);
    });
    it('ignores potential errors when calling `changeListener.onDelete`', async () => {
      changeListener.onGetAll.mockImplementation(() => {
        throw new Error('error in onCreate');
      });

      await expect(tagsClient.getAll()).resolves.toBeDefined();
    });
  });

  describe('#delete', () => {
    const tagId = 'id-to-delete';

    beforeEach(() => {
      http.delete.mockResolvedValue({});
    });

    it('calls `http.delete` with the correct parameters', async () => {
      await tagsClient.delete(tagId);

      expect(http.delete).toHaveBeenCalledTimes(1);
      expect(http.delete).toHaveBeenCalledWith(`/api/saved_objects_tagging/tags/${tagId}`);
    });
    it('forwards the error from the http call if any', async () => {
      const error = new Error('something when wrong');
      http.delete.mockRejectedValue(error);

      await expect(tagsClient.delete(tagId)).rejects.toThrowError(error);
    });
    it('notifies its changeListener if the http call succeed', async () => {
      await tagsClient.delete(tagId);

      expect(changeListener.onDelete).toHaveBeenCalledTimes(1);
      expect(changeListener.onDelete).toHaveBeenCalledWith(tagId);
    });
    it('ignores potential errors when calling `changeListener.onDelete`', async () => {
      changeListener.onDelete.mockImplementation(() => {
        throw new Error('error in onCreate');
      });

      await expect(tagsClient.delete(tagId)).resolves.toBeUndefined();
    });
  });

  describe('internal APIs', () => {
    describe('#find', () => {
      const findOptions: FindTagsOptions = {
        search: 'for, you know.',
      };
      let expectedTags: Tag[];

      beforeEach(() => {
        expectedTags = [
          createTag({ id: 'tag-1' }),
          createTag({ id: 'tag-2' }),
          createTag({ id: 'tag-3' }),
        ];
        http.get.mockResolvedValue({ tags: expectedTags, total: expectedTags.length });
      });

      it('calls `http.get` with the correct parameters', async () => {
        await tagsClient.find(findOptions);

        expect(http.get).toHaveBeenCalledTimes(1);
        expect(http.get).toHaveBeenCalledWith(`/internal/saved_objects_tagging/tags/_find`, {
          query: findOptions,
        });
      });
      it('returns the tag objects from the response', async () => {
        const { tags, total } = await tagsClient.find(findOptions);
        expect(tags).toEqual(expectedTags);
        expect(total).toEqual(3);
      });
      it('forwards the error from the http call if any', async () => {
        const error = new Error('something when wrong');
        http.get.mockRejectedValue(error);

        await expect(tagsClient.find(findOptions)).rejects.toThrowError(error);
      });
    });

    describe('#bulkDelete', () => {
      const tagIds = ['id-to-delete-1', 'id-to-delete-2'];

      beforeEach(() => {
        http.post.mockResolvedValue({});
      });

      it('calls `http.post` with the correct parameters', async () => {
        await tagsClient.bulkDelete(tagIds);

        expect(http.post).toHaveBeenCalledTimes(1);
        expect(http.post).toHaveBeenCalledWith(
          `/internal/saved_objects_tagging/tags/_bulk_delete`,
          {
            body: JSON.stringify({
              ids: tagIds,
            }),
          }
        );
      });
      it('forwards the error from the http call if any', async () => {
        const error = new Error('something when wrong');
        http.post.mockRejectedValue(error);

        await expect(tagsClient.bulkDelete(tagIds)).rejects.toThrowError(error);
      });
      it('notifies its changeListener if the http call succeed', async () => {
        await tagsClient.bulkDelete(tagIds);

        expect(changeListener.onDelete).toHaveBeenCalledTimes(2);
        expect(changeListener.onDelete).toHaveBeenCalledWith(tagIds[0]);
        expect(changeListener.onDelete).toHaveBeenCalledWith(tagIds[1]);
      });
      it('ignores potential errors when calling `changeListener.onDelete`', async () => {
        changeListener.onDelete.mockImplementation(() => {
          throw new Error('error in onCreate');
        });

        await expect(tagsClient.bulkDelete(tagIds)).resolves.toBeUndefined();
      });
    });
  });
});
