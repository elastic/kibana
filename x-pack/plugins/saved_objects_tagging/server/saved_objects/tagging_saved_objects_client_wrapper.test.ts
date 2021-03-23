/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from 'src/core/server/mocks';

import { TaggingSavedObjectsClientWrapper } from './tagging_saved_objects_client_wrapper';

describe('TaggingSavedObjectsClientWrapper', () => {
  function setup() {
    const baseClient = savedObjectsClientMock.create();
    const wrapper = new TaggingSavedObjectsClientWrapper({ baseClient });
    return { baseClient, wrapper };
  }

  describe('#create', () => {
    it('should call the base client method and return the result', async () => {
      const { baseClient, wrapper } = setup();
      const type = 'foo';
      const attributes = {};
      const options = {};

      const expectedValue = Symbol();
      baseClient.create.mockResolvedValue(expectedValue as any);

      await expect(wrapper.create(type, attributes, options)).resolves.toEqual(expectedValue);
      expect(baseClient.create).toHaveBeenCalledTimes(1);
      expect(baseClient.create).toHaveBeenCalledWith(type, attributes, options);
    });
  });

  describe('#bulkCreate', () => {
    it('should call the base client method and return the result', async () => {
      const { baseClient, wrapper } = setup();
      const objects = [{ type: 'foo', attributes: {} }];
      const options = {};

      const expectedValue = Symbol();
      baseClient.bulkCreate.mockResolvedValue(expectedValue as any);

      await expect(wrapper.bulkCreate(objects, options)).resolves.toEqual(expectedValue);
      expect(baseClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(baseClient.bulkCreate).toHaveBeenCalledWith(objects, options);
    });
  });

  describe('#checkConflicts', () => {
    it('should call the base client method and return the result', async () => {
      const { baseClient, wrapper } = setup();
      const objects = [{ type: 'foo', id: 'bar' }];
      const options = {};

      const expectedValue = Symbol();
      baseClient.checkConflicts.mockResolvedValue(expectedValue as any);

      await expect(wrapper.checkConflicts(objects, options)).resolves.toEqual(expectedValue);
      expect(baseClient.checkConflicts).toHaveBeenCalledTimes(1);
      expect(baseClient.checkConflicts).toHaveBeenCalledWith(objects, options);
    });
  });

  describe('#delete', () => {
    it('should call the base client method and return the result', async () => {
      const { baseClient, wrapper } = setup();
      const type = 'foo';
      const id = 'bar';
      const options = {};

      const expectedValue = Symbol();
      baseClient.delete.mockResolvedValue(expectedValue as any);

      await expect(wrapper.delete(type, id, options)).resolves.toEqual(expectedValue);
      expect(baseClient.delete).toHaveBeenCalledTimes(1);
      expect(baseClient.delete).toHaveBeenCalledWith(type, id, options);
    });
  });

  describe('#find', () => {
    it('should call the base client method and return the result', async () => {
      const { baseClient, wrapper } = setup();
      const options = { type: 'foo' };

      const expectedValue = Symbol();
      baseClient.find.mockResolvedValue(expectedValue as any);

      await expect(wrapper.find(options)).resolves.toEqual(expectedValue);
      expect(baseClient.find).toHaveBeenCalledTimes(1);
      expect(baseClient.find).toHaveBeenCalledWith(options);
    });
  });

  describe('#bulkGet', () => {
    it('should call the base client method and return the result', async () => {
      const { baseClient, wrapper } = setup();
      const objects = [{ type: 'foo', id: 'bar' }];
      const options = {};

      const expectedValue = Symbol();
      baseClient.bulkGet.mockResolvedValue(expectedValue as any);

      await expect(wrapper.bulkGet(objects, options)).resolves.toEqual(expectedValue);
      expect(baseClient.bulkGet).toHaveBeenCalledTimes(1);
      expect(baseClient.bulkGet).toHaveBeenCalledWith(objects, options);
    });
  });

  describe('#get', () => {
    it('should call the base client method and return the result', async () => {
      const { baseClient, wrapper } = setup();
      const type = 'foo';
      const id = 'bar';
      const options = {};

      const expectedValue = Symbol();
      baseClient.get.mockResolvedValue(expectedValue as any);

      await expect(wrapper.get(type, id, options)).resolves.toEqual(expectedValue);
      expect(baseClient.get).toHaveBeenCalledTimes(1);
      expect(baseClient.get).toHaveBeenCalledWith(type, id, options);
    });
  });

  describe('#resolve', () => {
    it('should call the base client method and return the result', async () => {
      const { baseClient, wrapper } = setup();
      const type = 'foo';
      const id = 'bar';
      const options = {};

      const expectedValue = Symbol();
      baseClient.resolve.mockResolvedValue(expectedValue as any);

      await expect(wrapper.resolve(type, id, options)).resolves.toEqual(expectedValue);
      expect(baseClient.resolve).toHaveBeenCalledTimes(1);
      expect(baseClient.resolve).toHaveBeenCalledWith(type, id, options);
    });
  });

  describe('#update', () => {
    it('should call the base client method and return the result', async () => {
      const { baseClient, wrapper } = setup();
      const type = 'foo';
      const id = 'bar';
      const attributes = {};
      const options = {};

      const expectedValue = Symbol();
      baseClient.update.mockResolvedValue(expectedValue as any);

      await expect(wrapper.update(type, id, attributes, options)).resolves.toEqual(expectedValue);
      expect(baseClient.update).toHaveBeenCalledTimes(1);
      expect(baseClient.update).toHaveBeenCalledWith(type, id, attributes, options);
    });
  });

  describe('#bulkUpdate', () => {
    it('should call the base client method and return the result', async () => {
      const { baseClient, wrapper } = setup();
      const objects = [{ type: 'foo', id: 'bar', attributes: {} }];
      const options = {};

      const expectedValue = Symbol();
      baseClient.bulkUpdate.mockResolvedValue(expectedValue as any);

      await expect(wrapper.bulkUpdate(objects, options)).resolves.toEqual(expectedValue);
      expect(baseClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(baseClient.bulkUpdate).toHaveBeenCalledWith(objects, options);
    });
  });

  describe('#removeReferencesTo', () => {
    it('should call the base client method and return the result', async () => {
      const { baseClient, wrapper } = setup();
      const type = 'foo';
      const id = 'bar';
      const options = {};

      const expectedValue = Symbol();
      baseClient.removeReferencesTo.mockResolvedValue(expectedValue as any);

      await expect(wrapper.removeReferencesTo(type, id, options)).resolves.toEqual(expectedValue);
      expect(baseClient.removeReferencesTo).toHaveBeenCalledTimes(1);
      expect(baseClient.removeReferencesTo).toHaveBeenCalledWith(type, id, options);
    });
  });

  describe('#openPointInTimeForType', () => {
    it('should call the base client method and return the result', async () => {
      const { baseClient, wrapper } = setup();
      const type = 'foo';
      const options = {};

      const expectedValue = Symbol();
      baseClient.openPointInTimeForType.mockResolvedValue(expectedValue as any);

      await expect(wrapper.openPointInTimeForType(type, options)).resolves.toEqual(expectedValue);
      expect(baseClient.openPointInTimeForType).toHaveBeenCalledTimes(1);
      expect(baseClient.openPointInTimeForType).toHaveBeenCalledWith(type, options);
    });
  });

  describe('#closePointInTime', () => {
    it('should call the base client method and return the result', async () => {
      const { baseClient, wrapper } = setup();
      const id = 'foo';
      const options = {};

      const expectedValue = Symbol();
      baseClient.closePointInTime.mockResolvedValue(expectedValue as any);

      await expect(wrapper.closePointInTime(id, options)).resolves.toEqual(expectedValue);
      expect(baseClient.closePointInTime).toHaveBeenCalledTimes(1);
      expect(baseClient.closePointInTime).toHaveBeenCalledWith(id, options);
    });
  });

  describe('#createPointInTimeFinder', () => {
    it('should call the base client method and return the result', async () => {
      const { baseClient, wrapper } = setup();
      const findOptions = { type: 'foo' };
      const dependencies = { client: baseClient };

      const expectedValue = Symbol();
      baseClient.createPointInTimeFinder.mockReturnValue(expectedValue as any);

      expect(wrapper.createPointInTimeFinder(findOptions, dependencies)).toEqual(expectedValue);
      expect(baseClient.createPointInTimeFinder).toHaveBeenCalledTimes(1);
      expect(baseClient.createPointInTimeFinder).toHaveBeenCalledWith(findOptions, dependencies);
    });
  });

  describe('#collectMultiNamespaceReferences', () => {
    it('should call the base client method and return the result', async () => {
      const { baseClient, wrapper } = setup();
      const objects = [{ type: 'foo', id: 'bar', attributes: {} }];
      const options = {};

      const expectedValue = Symbol();
      baseClient.collectMultiNamespaceReferences.mockResolvedValue(expectedValue as any);

      await expect(wrapper.collectMultiNamespaceReferences(objects, options)).resolves.toEqual(
        expectedValue
      );
      expect(baseClient.collectMultiNamespaceReferences).toHaveBeenCalledTimes(1);
      expect(baseClient.collectMultiNamespaceReferences).toHaveBeenCalledWith(objects, options);
    });

    it('should change typesToExclude if excludeTags is used', async () => {
      const { baseClient, wrapper } = setup();
      const objects = [{ type: 'foo', id: 'bar', attributes: {} }];

      await wrapper.collectMultiNamespaceReferences(objects, { excludeTags: true });
      await wrapper.collectMultiNamespaceReferences(objects, {
        excludeTags: true,
        typesToExclude: ['foo'],
      });
      expect(baseClient.collectMultiNamespaceReferences).toHaveBeenCalledTimes(2);
      expect(baseClient.collectMultiNamespaceReferences).toHaveBeenNthCalledWith(1, objects, {
        excludeTags: true,
        typesToExclude: ['tag'],
      });
      expect(baseClient.collectMultiNamespaceReferences).toHaveBeenNthCalledWith(2, objects, {
        excludeTags: true,
        typesToExclude: ['foo', 'tag'],
      });
    });
  });

  describe('#updateObjectsSpaces', () => {
    it('should call the base client method and return the result', async () => {
      const { baseClient, wrapper } = setup();
      const objects = [{ type: 'foo', id: 'bar' }];
      const spacesToAdd = ['baz'];
      const spacesToRemove = ['qux'];
      const options = {};

      const expectedValue = Symbol();
      baseClient.updateObjectsSpaces.mockResolvedValue(expectedValue as any);

      await expect(
        wrapper.updateObjectsSpaces(objects, spacesToAdd, spacesToRemove, options)
      ).resolves.toEqual(expectedValue);
      expect(baseClient.updateObjectsSpaces).toHaveBeenCalledTimes(1);
      expect(baseClient.updateObjectsSpaces).toHaveBeenCalledWith(
        objects,
        spacesToAdd,
        spacesToRemove,
        options
      );
    });
  });
});
