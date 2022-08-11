/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';

import type { HttpServiceSetup, KibanaRequest, SavedObjectsRepository } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';

import { DEFAULT_SPACE_ID } from '../../common/constants';
import { getSpaceIdFromPath } from '../../common/lib/spaces_url_parser';
import { spacesConfig } from '../lib/__fixtures__';
import { SpacesClientService } from '../spaces_client';
import { SpacesService } from './spaces_service';

const createService = (serverBasePath: string = '') => {
  const spacesService = new SpacesService();

  const coreStart = coreMock.createStart();

  const respositoryMock = {
    get: jest.fn().mockImplementation((type, id) => {
      if (type === 'space' && id === 'foo') {
        return Promise.resolve({
          id: 'space:foo',
          attributes: {
            name: 'Foo Space',
            disabledFeatures: [],
          },
        });
      }
      if (type === 'space' && id === 'default') {
        return Promise.resolve({
          id: 'space:default',
          attributes: {
            name: 'Default Space',
            disabledFeatures: [],
            _reserved: true,
          },
        });
      }
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }),
  } as unknown as SavedObjectsRepository;

  coreStart.savedObjects.createInternalRepository.mockReturnValue(respositoryMock);
  coreStart.savedObjects.createScopedRepository.mockReturnValue(respositoryMock);

  const httpSetup = coreMock.createSetup().http;
  httpSetup.basePath = {
    serverBasePath,
  } as HttpServiceSetup['basePath'];
  httpSetup.basePath.get = jest.fn().mockImplementation((request: KibanaRequest) => {
    const { spaceId } = getSpaceIdFromPath(request.url.pathname);

    if (spaceId !== DEFAULT_SPACE_ID) {
      return `/s/${spaceId}`;
    }
    return '/';
  });

  coreStart.http.basePath = httpSetup.basePath;

  const spacesServiceSetup = spacesService.setup({
    basePath: httpSetup.basePath,
  });

  const spacesClientService = new SpacesClientService(jest.fn());
  spacesClientService.setup({
    config$: Rx.of(spacesConfig),
  });

  const spacesClientServiceStart = spacesClientService.start(coreStart);

  const spacesServiceStart = spacesService.start({
    basePath: coreStart.http.basePath,
    spacesClientService: spacesClientServiceStart,
  });

  return {
    spacesServiceSetup,
    spacesServiceStart,
  };
};

describe('SpacesService', () => {
  describe('#getSpaceId', () => {
    it('returns the default space id when no identifier is present', async () => {
      const { spacesServiceStart } = createService();

      const request: KibanaRequest = {
        url: { pathname: '/app/kibana' },
      } as KibanaRequest;

      expect(spacesServiceStart.getSpaceId(request)).toEqual(DEFAULT_SPACE_ID);
    });

    it('returns the space id when identifier is present', async () => {
      const { spacesServiceStart } = createService();

      const request: KibanaRequest = {
        url: { pathname: '/s/foo/app/kibana' },
      } as KibanaRequest;

      expect(spacesServiceStart.getSpaceId(request)).toEqual('foo');
    });
  });

  describe('#isInDefaultSpace', () => {
    it('returns true when in the default space', async () => {
      const { spacesServiceStart } = createService();

      const request: KibanaRequest = {
        url: { pathname: '/app/kibana' },
      } as KibanaRequest;

      expect(spacesServiceStart.isInDefaultSpace(request)).toEqual(true);
    });

    it('returns false when not in the default space', async () => {
      const { spacesServiceStart } = createService();

      const request: KibanaRequest = {
        url: { pathname: '/s/foo/app/kibana' },
      } as KibanaRequest;

      expect(spacesServiceStart.isInDefaultSpace(request)).toEqual(false);
    });
  });

  describe('#spaceIdToNamespace', () => {
    it('returns the namespace for the given space', async () => {
      const { spacesServiceSetup } = createService();
      expect(spacesServiceSetup.spaceIdToNamespace('foo')).toEqual('foo');
    });
  });

  describe('#namespaceToSpaceId', () => {
    it('returns the space id for the given namespace', async () => {
      const { spacesServiceSetup } = createService();
      expect(spacesServiceSetup.namespaceToSpaceId('foo')).toEqual('foo');
    });
  });

  describe('#getActiveSpace', () => {
    it('returns the default space when in the default space', async () => {
      const { spacesServiceStart } = createService();
      const request = httpServerMock.createKibanaRequest({ path: 'app/kibana' });

      const activeSpace = await spacesServiceStart.getActiveSpace(request);
      expect(activeSpace).toEqual({
        id: 'space:default',
        name: 'Default Space',
        disabledFeatures: [],
        _reserved: true,
      });
    });

    it('returns the space for the current (non-default) space', async () => {
      const { spacesServiceStart } = createService();
      const request = httpServerMock.createKibanaRequest({ path: '/s/foo/app/kibana' });

      const activeSpace = await spacesServiceStart.getActiveSpace(request);
      expect(activeSpace).toEqual({
        id: 'space:foo',
        name: 'Foo Space',
        disabledFeatures: [],
      });
    });

    it('propagates errors from the repository', async () => {
      const { spacesServiceStart } = createService();
      const request = httpServerMock.createKibanaRequest({ path: '/s/unknown-space/app/kibana' });

      await expect(
        spacesServiceStart.getActiveSpace(request)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Saved object [space/unknown-space] not found"`
      );
    });
  });
});
