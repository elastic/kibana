/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as Rx from 'rxjs';
import { SpacesService } from './spaces_service';
import { coreMock, elasticsearchServiceMock } from 'src/core/server/mocks';
import { SpacesAuditLogger } from '../lib/audit_logger';
import { KibanaRequest, SavedObjectsService } from 'src/core/server';
import { DEFAULT_SPACE_ID } from '../../common/constants';
import { getSpaceIdFromPath } from '../lib/spaces_url_parser';
import { LegacyAPI } from '../plugin';
import { createOptionalPlugin } from '../../../../legacy/server/lib/optional_plugin';

const mockLogger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  log: jest.fn(),
};

const createService = async (serverBasePath: string = '') => {
  const legacyAPI = {
    legacyConfig: {
      serverBasePath,
    },
    savedObjects: ({
      getSavedObjectsRepository: jest.fn().mockReturnValue(null),
    } as unknown) as SavedObjectsService,
  } as LegacyAPI;

  const spacesService = new SpacesService(mockLogger, () => legacyAPI);

  const httpSetup = coreMock.createSetup().http;
  httpSetup.basePath.get = jest.fn().mockImplementation((request: KibanaRequest) => {
    const spaceId = getSpaceIdFromPath(request.url.path);

    if (spaceId !== DEFAULT_SPACE_ID) {
      return `/s/${spaceId}`;
    }
    return '/';
  });

  const spacesServiceSetup = await spacesService.setup({
    http: httpSetup,
    elasticsearch: elasticsearchServiceMock.createSetupContract(),
    config$: Rx.of({ maxSpaces: 10 }),
    getSecurity: () => createOptionalPlugin({ get: () => null }, 'xpack.security', {}, 'security'),
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
});
