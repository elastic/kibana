/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { nextTick } from '@kbn/test-jest-helpers';

import { SpacesManager } from './spaces_manager';

describe('SpacesManager', () => {
  describe('#constructor', () => {
    it('does not attempt to retrieve the active space', () => {
      const coreStart = coreMock.createStart();
      new SpacesManager(coreStart.http);
      expect(coreStart.http.get).not.toHaveBeenCalled();
    });
  });

  describe('#getActiveSpace', () => {
    it('attempts to retrieve the active space using the existing get request', async () => {
      const coreStart = coreMock.createStart();
      coreStart.http.get.mockResolvedValue({
        id: 'my-space',
        name: 'my space',
      });
      const spacesManager = new SpacesManager(coreStart.http);
      await spacesManager.getActiveSpace();
      expect(coreStart.http.get).toHaveBeenCalledWith('/internal/spaces/_active_space');

      await nextTick();

      const activeSpace = await spacesManager.getActiveSpace();
      expect(activeSpace).toEqual({
        id: 'my-space',
        name: 'my space',
      });
      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
    });

    it('throws if on an anonymous path', () => {
      const coreStart = coreMock.createStart();
      coreStart.http.anonymousPaths.isAnonymous.mockReturnValue(true);
      const spacesManager = new SpacesManager(coreStart.http);
      expect(coreStart.http.get).not.toHaveBeenCalled();

      expect(() => spacesManager.getActiveSpace()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Cannot retrieve the active space for anonymous paths"`
      );
    });

    it('allows for a force-refresh', async () => {
      const coreStart = coreMock.createStart();
      coreStart.http.get
        .mockResolvedValueOnce({
          id: 'my-space',
          name: 'my space',
        })
        .mockResolvedValueOnce({
          id: 'my-other-space',
          name: 'my other space',
        });

      const spacesManager = new SpacesManager(coreStart.http);

      const activeSpace = await spacesManager.getActiveSpace();
      expect(activeSpace).toEqual({
        id: 'my-space',
        name: 'my space',
      });
      expect(coreStart.http.get).toHaveBeenCalledTimes(1);

      const newActiveSpace = await spacesManager.getActiveSpace({ forceRefresh: true });
      expect(newActiveSpace).toEqual({
        id: 'my-other-space',
        name: 'my other space',
      });
      expect(coreStart.http.get).toHaveBeenCalledTimes(2);
    });

    it('force-refresh still throws for anonymous paths', async () => {
      const coreStart = coreMock.createStart();
      coreStart.http.anonymousPaths.isAnonymous.mockReturnValue(true);
      coreStart.http.get.mockResolvedValueOnce({
        id: 'my-space',
        name: 'my space',
      });

      const spacesManager = new SpacesManager(coreStart.http);

      expect(() =>
        spacesManager.getActiveSpace({ forceRefresh: true })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Cannot retrieve the active space for anonymous paths"`
      );
    });
  });

  describe('#getShareSavedObjectPermissions', () => {
    it('retrieves share permissions for the specified type and returns result', async () => {
      const coreStart = coreMock.createStart();
      const shareToAllSpaces = Symbol();
      coreStart.http.get.mockResolvedValue({ shareToAllSpaces });
      const spacesManager = new SpacesManager(coreStart.http);

      const result = await spacesManager.getShareSavedObjectPermissions('foo');
      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
      expect(coreStart.http.get).toHaveBeenLastCalledWith(
        '/internal/security/_share_saved_object_permissions',
        {
          query: { type: 'foo' },
        }
      );
      expect(result).toEqual({ shareToAllSpaces });
    });

    it('allows the share if security is disabled', async () => {
      const coreStart = coreMock.createStart();
      coreStart.http.get.mockRejectedValueOnce({
        body: {
          statusCode: 404,
        },
      });
      const spacesManager = new SpacesManager(coreStart.http);

      const result = await spacesManager.getShareSavedObjectPermissions('foo');
      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
      expect(coreStart.http.get).toHaveBeenLastCalledWith(
        '/internal/security/_share_saved_object_permissions',
        {
          query: { type: 'foo' },
        }
      );
      expect(result).toEqual({ shareToAllSpaces: true });
    });

    it('throws all other errors', async () => {
      const coreStart = coreMock.createStart();
      coreStart.http.get.mockRejectedValueOnce(new Error('Get out of here!'));
      const spacesManager = new SpacesManager(coreStart.http);

      await expect(
        spacesManager.getShareSavedObjectPermissions('foo')
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Get out of here!"`);

      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
      expect(coreStart.http.get).toHaveBeenLastCalledWith(
        '/internal/security/_share_saved_object_permissions',
        {
          query: { type: 'foo' },
        }
      );
    });
  });

  describe('#getShareableReferences', () => {
    it('retrieves the shareable references, filters out references that are tags, and returns the result', async () => {
      const obj1 = { type: 'not-a-tag', id: '1' }; // requested object
      const obj2 = { type: 'tag', id: '2' }; // requested object
      const obj3 = { type: 'tag', id: '3' }; // referenced object
      const obj4 = { type: 'not-a-tag', id: '4' }; // referenced object

      const coreStart = coreMock.createStart();
      coreStart.http.post.mockResolvedValue({ objects: [obj1, obj2, obj3, obj4] }); // A realistic response would include additional fields besides 'type' and 'id', but they are not needed for this test case
      const spacesManager = new SpacesManager(coreStart.http);

      const requestObjects = [obj1, obj2];
      const result = await spacesManager.getShareableReferences(requestObjects);
      expect(coreStart.http.post).toHaveBeenCalledTimes(1);
      expect(coreStart.http.post).toHaveBeenLastCalledWith(
        '/api/spaces/_get_shareable_references',
        { body: JSON.stringify({ objects: requestObjects }) }
      );
      expect(result).toEqual({
        objects: [
          obj1, // obj1 is not a tag
          obj2, // obj2 is a tag, but it was included in the request, so it is not excluded from the response
          // obj3 is a tag, but it was not included in the request, so it is excluded from the response
          obj4, // obj4 is not a tag
        ],
      });
    });
  });
});
