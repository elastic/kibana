/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesManager } from '.';
import { coreMock } from 'src/core/public/mocks';
import { nextTick } from 'test_utils/enzyme_helpers';

describe('SpacesManager', () => {
  describe('#constructor', () => {
    it('attempts to retrieve the active space', () => {
      const coreStart = coreMock.createStart();
      new SpacesManager(coreStart.http);
      expect(coreStart.http.get).toHaveBeenCalledWith('/internal/spaces/_active_space');
    });

    it('does not retrieve the active space if on an anonymous path', () => {
      const coreStart = coreMock.createStart();
      coreStart.http.anonymousPaths.isAnonymous.mockReturnValue(true);
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

      expect(() => spacesManager.getActiveSpace()).toThrowErrorMatchingInlineSnapshot(
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
      expect(coreStart.http.get).toHaveBeenCalledWith('/internal/spaces/_active_space');

      await nextTick();

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
      ).toThrowErrorMatchingInlineSnapshot(
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
      expect(coreStart.http.get).toHaveBeenCalledTimes(1); // initial call to get active space

      const result = await spacesManager.getShareSavedObjectPermissions('foo');
      expect(coreStart.http.get).toHaveBeenCalledTimes(2);
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
      coreStart.http.get.mockResolvedValueOnce({});
      coreStart.http.get.mockRejectedValueOnce({
        body: {
          statusCode: 404,
        },
      });
      const spacesManager = new SpacesManager(coreStart.http);
      expect(coreStart.http.get).toHaveBeenCalledTimes(1); // initial call to get active space

      const result = await spacesManager.getShareSavedObjectPermissions('foo');
      expect(coreStart.http.get).toHaveBeenCalledTimes(2);
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
      coreStart.http.get.mockResolvedValueOnce({});
      coreStart.http.get.mockRejectedValueOnce(new Error('Get out of here!'));
      const spacesManager = new SpacesManager(coreStart.http);
      expect(coreStart.http.get).toHaveBeenCalledTimes(1); // initial call to get active space

      await expect(
        spacesManager.getShareSavedObjectPermissions('foo')
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Get out of here!"`);

      expect(coreStart.http.get).toHaveBeenCalledTimes(2);
      expect(coreStart.http.get).toHaveBeenLastCalledWith(
        '/internal/security/_share_saved_object_permissions',
        {
          query: { type: 'foo' },
        }
      );
    });
  });
});
