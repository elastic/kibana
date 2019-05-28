/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as Rx from 'rxjs';
import { SpacesService } from './spaces_service';
import { httpServiceMock, elasticsearchServiceMock } from 'src/core/server/mocks';
import { SpacesAuditLogger } from '../../lib/audit_logger';
import { SavedObjectsService } from 'src/legacy/server/kbn_server';
import { KibanaRequest } from 'src/core/server';
import { DEFAULT_SPACE_ID } from '../../../common/constants';
import { getSpaceIdFromPath } from '../../lib/spaces_url_parser';

const mockLogger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  log: jest.fn(),
};

const createService = async () => {
  const spacesService = new SpacesService(mockLogger, '/base-path');

  const httpSetup = httpServiceMock.createSetupContract();
  httpSetup.getBasePathFor = jest.fn().mockImplementation((request: KibanaRequest) => {
    const spaceId = getSpaceIdFromPath(request.path);

    if (spaceId !== DEFAULT_SPACE_ID) {
      return `/s/${spaceId}`;
    }
    return '/';
  });

  const spacesServiceSetup = await spacesService.setup({
    http: httpSetup,
    elasticsearch: elasticsearchServiceMock.createSetupContract(),
    config$: Rx.of({ maxSpaces: 10 }),
    getSecurity: () => undefined,
    savedObjects: ({
      getSavedObjectsRepository: jest.fn().mockReturnValue(null),
    } as unknown) as SavedObjectsService,
    spacesAuditLogger: new SpacesAuditLogger({}),
  });

  return spacesServiceSetup;
};

describe('SpacesService', () => {
  describe('#getSpaceId', () => {
    it('returns the default space id when no identifier is present', async () => {
      const spacesServiceSetup = await createService();

      const request: KibanaRequest = {
        path: '/app/kibana',
      } as KibanaRequest;

      expect(spacesServiceSetup.getSpaceId(request)).toEqual(DEFAULT_SPACE_ID);
    });

    it('returns the space id when identifier is present', async () => {
      const spacesServiceSetup = await createService();

      const request: KibanaRequest = {
        path: '/s/foo/app/kibana',
      } as KibanaRequest;

      expect(spacesServiceSetup.getSpaceId(request)).toEqual('foo');
    });
  });

  describe('#isInDefaultSpace', () => {
    it('returns true when in the default space', async () => {
      const spacesServiceSetup = await createService();

      const request: KibanaRequest = {
        path: '/app/kibana',
      } as KibanaRequest;

      expect(spacesServiceSetup.isInDefaultSpace(request)).toEqual(true);
    });

    it('returns false when not in the default space', async () => {
      const spacesServiceSetup = await createService();

      const request: KibanaRequest = {
        path: '/s/foo/app/kibana',
      } as KibanaRequest;

      expect(spacesServiceSetup.isInDefaultSpace(request)).toEqual(false);
    });
  });
});
