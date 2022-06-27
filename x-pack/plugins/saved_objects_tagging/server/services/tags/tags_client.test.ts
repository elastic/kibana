/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateTagMock } from './tags_client.test.mocks';

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { TagAttributes, TagSavedObject } from '../../../common/types';
import { TagValidation } from '../../../common/validation';
import { TagsClient } from './tags_client';
import { TagValidationError } from './errors';

const createAttributes = (parts: Partial<TagAttributes> = {}): TagAttributes => ({
  name: 'a-tag',
  description: 'some-desc',
  color: '#FF00CC',
  ...parts,
});

const createTagSavedObject = (
  id: string = 'tag-id',
  attributes: TagAttributes = createAttributes()
): TagSavedObject => ({
  id,
  attributes,
  type: 'tag',
  references: [],
});

const createValidation = (errors: TagValidation['errors'] = {}): TagValidation => ({
  valid: Object.keys(errors).length === 0,
  warnings: [],
  errors,
});

describe('TagsClient', () => {
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  let tagsClient: TagsClient;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    tagsClient = new TagsClient({ client: soClient });

    validateTagMock.mockReturnValue({ valid: true });
  });

  describe('#create', () => {
    beforeEach(() => {
      soClient.create.mockResolvedValue(createTagSavedObject());
    });

    it('calls `soClient.create` with the correct parameters', async () => {
      const attributes = createAttributes();

      await tagsClient.create(attributes);

      expect(soClient.create).toHaveBeenCalledTimes(1);
      expect(soClient.create).toHaveBeenCalledWith('tag', attributes);
    });

    it('converts the object returned from the soClient to a `Tag`', async () => {
      const id = 'some-id';
      const attributes = createAttributes();
      soClient.create.mockResolvedValue(createTagSavedObject(id, attributes));

      const tag = await tagsClient.create(attributes);
      expect(tag).toEqual({
        id,
        ...attributes,
      });
    });

    it('returns a `TagValidationError` if attributes validation fails', async () => {
      const validation = createValidation({
        name: 'Invalid name',
      });
      validateTagMock.mockReturnValue(validation);

      await expect(tagsClient.create(createAttributes())).rejects.toThrowError(TagValidationError);
    });

    it('does not call `soClient.create` if attributes validation fails', async () => {
      expect.assertions(1);

      const validation = createValidation({
        name: 'Invalid name',
      });
      validateTagMock.mockReturnValue(validation);

      try {
        await tagsClient.create(createAttributes());
      } catch (e) {
        expect(soClient.create).not.toHaveBeenCalled();
      }
    });
  });

  describe('#update', () => {
    const tagId = 'some-id';

    beforeEach(() => {
      soClient.update.mockResolvedValue(createTagSavedObject());
    });

    it('calls `soClient.update` with the correct parameters', async () => {
      const attributes = createAttributes();

      await tagsClient.update(tagId, attributes);

      expect(soClient.update).toHaveBeenCalledTimes(1);
      expect(soClient.update).toHaveBeenCalledWith('tag', tagId, attributes);
    });

    it('converts the object returned from the soClient to a `Tag`', async () => {
      const attributes = createAttributes();
      soClient.update.mockResolvedValue(createTagSavedObject(tagId, attributes));

      const tag = await tagsClient.update(tagId, attributes);
      expect(tag).toEqual({
        id: tagId,
        ...attributes,
      });
    });

    it('returns a `TagValidationError` if attributes validation fails', async () => {
      const validation = createValidation({
        name: 'Invalid name',
      });
      validateTagMock.mockReturnValue(validation);

      await expect(tagsClient.update(tagId, createAttributes())).rejects.toThrowError(
        TagValidationError
      );
    });

    it('does not call `soClient.create` if attributes validation fails', async () => {
      expect.assertions(1);

      const validation = createValidation({
        name: 'Invalid name',
      });
      validateTagMock.mockReturnValue(validation);

      try {
        await tagsClient.update(tagId, createAttributes());
      } catch (e) {
        expect(soClient.update).not.toHaveBeenCalled();
      }
    });
  });

  describe('#get', () => {
    const tagId = 'some-id';
    const tagObject = createTagSavedObject(tagId);

    beforeEach(() => {
      soClient.get.mockResolvedValue(tagObject);
    });

    it('calls `soClient.get` with the correct parameters', async () => {
      await tagsClient.get(tagId);

      expect(soClient.get).toHaveBeenCalledTimes(1);
      expect(soClient.get).toHaveBeenCalledWith('tag', tagId);
    });

    it('converts the object returned from the soClient to a `Tag`', async () => {
      const tag = await tagsClient.get(tagId);
      expect(tag).toEqual({
        id: tagId,
        ...tagObject.attributes,
      });
    });
  });
  describe('#getAll', () => {
    const tags = [
      createTagSavedObject('tag-1'),
      createTagSavedObject('tag-2'),
      createTagSavedObject('tag-3'),
    ];

    beforeEach(() => {
      soClient.find.mockResolvedValue({
        saved_objects: tags.map((tag) => ({ ...tag, score: 1 })),
        total: 3,
        per_page: 1000,
        page: 0,
      });
    });

    it('calls `soClient.find` with the correct parameters', async () => {
      await tagsClient.getAll();

      expect(soClient.createPointInTimeFinder).toHaveBeenCalledTimes(1);
      expect(soClient.createPointInTimeFinder).toHaveBeenCalledWith({
        type: 'tag',
        perPage: 1000,
      });

      expect(soClient.find).toHaveBeenCalledTimes(1);
      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tag',
          perPage: 1000,
        })
      );
    });

    it('converts the objects returned from the soClient to tags', async () => {
      const returnedTags = await tagsClient.getAll();
      expect(returnedTags).toEqual(tags.map((tag) => ({ id: tag.id, ...tag.attributes })));
    });
  });
  describe('#delete', () => {
    const tagId = 'tag-id';

    it('calls `soClient.delete` with the correct parameters', async () => {
      await tagsClient.delete(tagId);

      expect(soClient.delete).toHaveBeenCalledTimes(1);
      expect(soClient.delete).toHaveBeenCalledWith('tag', tagId);
    });

    it('calls `soClient.removeReferencesTo` with the correct parameters', async () => {
      await tagsClient.delete(tagId);

      expect(soClient.removeReferencesTo).toHaveBeenCalledTimes(1);
      expect(soClient.removeReferencesTo).toHaveBeenCalledWith('tag', tagId);
    });

    it('calls `soClient.removeReferencesTo` before `soClient.delete`', async () => {
      await tagsClient.delete(tagId);

      expect(soClient.removeReferencesTo.mock.invocationCallOrder[0]).toBeLessThan(
        soClient.delete.mock.invocationCallOrder[0]
      );
    });

    it('does not calls `soClient.delete` if `soClient.removeReferencesTo` throws', async () => {
      soClient.removeReferencesTo.mockRejectedValue(new Error('something went wrong'));

      await expect(tagsClient.delete(tagId)).rejects.toThrowError();

      expect(soClient.delete).not.toHaveBeenCalled();
    });
  });
});
