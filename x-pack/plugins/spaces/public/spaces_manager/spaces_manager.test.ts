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
      new SpacesManager('/server-base-path', coreStart.http);
      expect(coreStart.http.get).toHaveBeenCalledWith('/internal/spaces/_active_space');
    });

    it('does not retrieve the active space if on an anonymous path', () => {
      const coreStart = coreMock.createStart();
      coreStart.http.anonymousPaths.isAnonymous.mockReturnValue(true);
      new SpacesManager('/server-base-path', coreStart.http);
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
      const spacesManager = new SpacesManager('/server-base-path', coreStart.http);
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
      const spacesManager = new SpacesManager('/server-base-path', coreStart.http);
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

      const spacesManager = new SpacesManager('/server-base-path', coreStart.http);
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

      const spacesManager = new SpacesManager('/server-base-path', coreStart.http);

      expect(() =>
        spacesManager.getActiveSpace({ forceRefresh: true })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Cannot retrieve the active space for anonymous paths"`
      );
    });
  });
});
