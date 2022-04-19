/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';

import { spacesServiceMock } from '../spaces_service/spaces_service.mock';
import { SPACES_USAGE_STATS_TYPE } from '../usage_stats';
import { SpacesSavedObjectsService } from './saved_objects_service';

describe('SpacesSavedObjectsService', () => {
  describe('#setup', () => {
    it('registers the "space" saved object type with appropriate mappings and migrations', () => {
      const core = coreMock.createSetup();
      const spacesService = spacesServiceMock.createStartContract();

      const service = new SpacesSavedObjectsService();
      service.setup({ core, getSpacesService: () => spacesService });

      expect(core.savedObjects.registerType).toHaveBeenCalledTimes(2);
      expect(core.savedObjects.registerType).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ name: 'space' })
      );
      expect(core.savedObjects.registerType).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ name: SPACES_USAGE_STATS_TYPE })
      );
    });

    it('registers the client wrapper', () => {
      const core = coreMock.createSetup();
      const spacesService = spacesServiceMock.createStartContract();

      const service = new SpacesSavedObjectsService();
      service.setup({ core, getSpacesService: () => spacesService });

      expect(core.savedObjects.addClientWrapper).toHaveBeenCalledTimes(1);
      expect(core.savedObjects.addClientWrapper).toHaveBeenCalledWith(
        Number.MIN_SAFE_INTEGER,
        'spaces',
        expect.any(Function)
      );
    });
  });
});
