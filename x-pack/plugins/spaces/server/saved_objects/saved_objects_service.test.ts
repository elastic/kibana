/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock } from 'src/core/server/mocks';
import { spacesServiceMock } from '../spaces_service/spaces_service.mock';
import { SpacesSavedObjectsService } from './saved_objects_service';

describe('SpacesSavedObjectsService', () => {
  describe('#setup', () => {
    it('registers the "space" saved object type with appropriate mappings and migrations', () => {
      const core = coreMock.createSetup();
      const spacesService = spacesServiceMock.createSetupContract();

      const service = new SpacesSavedObjectsService();
      service.setup({ core, spacesService });

      expect(core.savedObjects.registerType).toHaveBeenCalledTimes(1);
      expect(core.savedObjects.registerType.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "hidden": true,
            "mappings": Object {
              "properties": Object {
                "_reserved": Object {
                  "type": "boolean",
                },
                "color": Object {
                  "type": "keyword",
                },
                "description": Object {
                  "type": "text",
                },
                "disabledFeatures": Object {
                  "type": "keyword",
                },
                "imageUrl": Object {
                  "index": false,
                  "type": "text",
                },
                "initials": Object {
                  "type": "keyword",
                },
                "name": Object {
                  "fields": Object {
                    "keyword": Object {
                      "ignore_above": 2048,
                      "type": "keyword",
                    },
                  },
                  "type": "text",
                },
              },
            },
            "migrations": Object {
              "6.6.0": [Function],
            },
            "name": "space",
            "namespaceType": "agnostic",
          },
        ]
      `);
    });

    it('registers the client wrapper', () => {
      const core = coreMock.createSetup();
      const spacesService = spacesServiceMock.createSetupContract();

      const service = new SpacesSavedObjectsService();
      service.setup({ core, spacesService });

      expect(core.savedObjects.addClientWrapper).toHaveBeenCalledTimes(1);
      expect(core.savedObjects.addClientWrapper).toHaveBeenCalledWith(
        Number.MIN_SAFE_INTEGER,
        'spaces',
        expect.any(Function)
      );
    });
  });
});
