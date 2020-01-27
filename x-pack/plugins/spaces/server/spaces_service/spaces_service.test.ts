/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as Rx from 'rxjs';
import { SpacesService } from './spaces_service';
import {
  coreMock,
  elasticsearchServiceMock,
  httpServerMock,
  loggingServiceMock,
} from 'src/core/server/mocks';
import { SpacesAuditLogger } from '../lib/audit_logger';
import {
  KibanaRequest,
  SavedObjectsLegacyService,
  SavedObjectsErrorHelpers,
  HttpServiceSetup,
} from 'src/core/server';
import { DEFAULT_SPACE_ID } from '../../common/constants';
import { getSpaceIdFromPath } from '../../common/lib/spaces_url_parser';
import { LegacyAPI } from '../plugin';
import { spacesConfig } from '../lib/__fixtures__';
import { securityMock } from '../../../security/server/mocks';

const mockLogger = loggingServiceMock.createLogger();

const createService = async (serverBasePath: string = '') => {
  const legacyAPI = {
    legacyConfig: {},
    savedObjects: ({
      getSavedObjectsRepository: jest.fn().mockReturnValue({
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
      }),
    } as unknown) as SavedObjectsLegacyService,
  } as LegacyAPI;

  const spacesService = new SpacesService(mockLogger, () => legacyAPI);

  const httpSetup = coreMock.createSetup().http;
  httpSetup.basePath = {
    serverBasePath,
  } as HttpServiceSetup['basePath'];
  httpSetup.basePath.get = jest.fn().mockImplementation((request: KibanaRequest) => {
    const spaceId = getSpaceIdFromPath(request.url.path);

    if (spaceId !== DEFAULT_SPACE_ID) {
      return `/s/${spaceId}`;
    }
    return '/';
  });

  const spacesServiceSetup = await spacesService.setup({
    http: httpSetup,
    elasticsearch: elasticsearchServiceMock.createSetup(),
    config$: Rx.of(spacesConfig),
    authorization: securityMock.createSetup().authz,
    getSpacesAuditLogger: () => new SpacesAuditLogger({}),
  });

  return spacesServiceSetup;
};

describe('SpacesService', () => {
  describe('#getSpaceId', () => {
    it('returns the default space id when no identifier is present', async () => {
      const spacesServiceSetup = await createService();

      const request: KibanaRequest = {
        url: { path: '/app/kibana' },
      } as KibanaRequest;

      expect(spacesServiceSetup.getSpaceId(request)).toEqual(DEFAULT_SPACE_ID);
    });

    it('returns the space id when identifier is present', async () => {
      const spacesServiceSetup = await createService();

      const request: KibanaRequest = {
        url: { path: '/s/foo/app/kibana' },
      } as KibanaRequest;

      expect(spacesServiceSetup.getSpaceId(request)).toEqual('foo');
    });
  });

  describe('#getBasePath', () => {
    it(`throws when a space id is not provided`, async () => {
      const spacesServiceSetup = await createService();

      // @ts-ignore TS knows this isn't right
      expect(() => spacesServiceSetup.getBasePath()).toThrowErrorMatchingInlineSnapshot(
        `"spaceId is required to retrieve base path"`
      );

      expect(() => spacesServiceSetup.getBasePath('')).toThrowErrorMatchingInlineSnapshot(
        `"spaceId is required to retrieve base path"`
      );
    });

    it('returns "" for the default space and no server base path', async () => {
      const spacesServiceSetup = await createService();
      expect(spacesServiceSetup.getBasePath(DEFAULT_SPACE_ID)).toEqual('');
    });

    it('returns /sbp for the default space and the "/sbp" server base path', async () => {
      const spacesServiceSetup = await createService('/sbp');
      expect(spacesServiceSetup.getBasePath(DEFAULT_SPACE_ID)).toEqual('/sbp');
    });

    it('returns /s/foo for the foo space and no server base path', async () => {
      const spacesServiceSetup = await createService();
      expect(spacesServiceSetup.getBasePath('foo')).toEqual('/s/foo');
    });

    it('returns /sbp/s/foo for the foo space and the "/sbp" server base path', async () => {
      const spacesServiceSetup = await createService('/sbp');
      expect(spacesServiceSetup.getBasePath('foo')).toEqual('/sbp/s/foo');
    });
  });

  describe('#isInDefaultSpace', () => {
    it('returns true when in the default space', async () => {
      const spacesServiceSetup = await createService();

      const request: KibanaRequest = {
        url: { path: '/app/kibana' },
      } as KibanaRequest;

      expect(spacesServiceSetup.isInDefaultSpace(request)).toEqual(true);
    });

    it('returns false when not in the default space', async () => {
      const spacesServiceSetup = await createService();

      const request: KibanaRequest = {
        url: { path: '/s/foo/app/kibana' },
      } as KibanaRequest;

      expect(spacesServiceSetup.isInDefaultSpace(request)).toEqual(false);
    });
  });

  describe('#spaceIdToNamespace', () => {
    it('returns the namespace for the given space', async () => {
      const spacesServiceSetup = await createService();
      expect(spacesServiceSetup.spaceIdToNamespace('foo')).toEqual('foo');
    });
  });

  describe('#namespaceToSpaceId', () => {
    it('returns the space id for the given namespace', async () => {
      const spacesServiceSetup = await createService();
      expect(spacesServiceSetup.namespaceToSpaceId('foo')).toEqual('foo');
    });
  });

  describe('#getActiveSpace', () => {
    it('returns the default space when in the default space', async () => {
      const spacesServiceSetup = await createService();
      const request = httpServerMock.createKibanaRequest({ path: 'app/kibana' });

      const activeSpace = await spacesServiceSetup.getActiveSpace(request);
      expect(activeSpace).toEqual({
        id: 'space:default',
        name: 'Default Space',
        disabledFeatures: [],
        _reserved: true,
      });
    });

    it('returns the space for the current (non-default) space', async () => {
      const spacesServiceSetup = await createService();
      const request = httpServerMock.createKibanaRequest({ path: '/s/foo/app/kibana' });

      const activeSpace = await spacesServiceSetup.getActiveSpace(request);
      expect(activeSpace).toEqual({
        id: 'space:foo',
        name: 'Foo Space',
        disabledFeatures: [],
      });
    });

    it('propagates errors from the repository', async () => {
      const spacesServiceSetup = await createService();
      const request = httpServerMock.createKibanaRequest({ path: '/s/unknown-space/app/kibana' });

      await expect(
        spacesServiceSetup.getActiveSpace(request)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Saved object [space/unknown-space] not found"`
      );
    });
  });
});
