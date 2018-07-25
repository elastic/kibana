/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesSavedObjectsClient } from './spaces_saved_objects_client';
import { createSpacesService } from '../create_spaces_service';

const createObjectEntry = (type, id, spaceId) => ({
  [id]: {
    id,
    type,
    spaceId
  }
});

const SAVED_OBJECTS = {
  ...createObjectEntry('foo', 'object_0'),
  ...createObjectEntry('foo', 'object_1', 'space_1'),
  ...createObjectEntry('foo', 'object_2', 'space_2'),
  ...createObjectEntry('space', 'space_1'),
};

const config = {
  'server.basePath': '/'
};

const server = {
  config: () => ({
    get: (key) => {
      return config[key];
    }
  })
};

const createMockRequest = (space) => ({
  getBasePath: () => space.urlContext ? `/s/${space.urlContext}` : '',
});

const createMockClient = (space) => {
  return {
    get: jest.fn((type, id) => {
      return SAVED_OBJECTS[id];
    }),
    bulkGet: jest.fn((objects) => {
      return {
        saved_objects: objects.map(object => SAVED_OBJECTS[object.id])
      };
    }),
    find: jest.fn(({ type }) => {
      // used to locate spaces when type is `space` within these tests
      if (type === 'space') {
        return {
          saved_objects: [space]
        };
      }
      return {
        saved_objects: []
      };
    }),
    create: jest.fn(),
    bulkCreate: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    errors: {
      createGenericNotFoundError: jest.fn(() => {
        return new Error('not found');
      })
    }
  };
};

describe('default space', () => {
  const currentSpace = {
    id: 'default',
    urlContext: ''
  };

  describe('#get', () => {
    test(`returns the object when it belongs to the current space`, async () => {

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';
      const id = 'object_0';
      const options = {};

      const result = await client.get(type, id, options);

      expect(result).toBe(SAVED_OBJECTS[id]);
    });

    test(`returns global objects that don't belong to a specific space`, async () => {
      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'space';
      const id = 'space_1';
      const options = {};

      const result = await client.get(type, id, options);

      expect(result).toBe(SAVED_OBJECTS[id]);
    });

    test(`merges options.extraDocumentProperties`, async () => {

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';
      const id = 'object_0';
      const options = {
        extraDocumentProperties: ['otherSourceProp']
      };

      await client.get(type, id, options);

      expect(baseClient.get).toHaveBeenCalledWith(type, id, {
        extraDocumentProperties: ['spaceId', 'otherSourceProp']
      });
    });

    test(`returns error when the object belongs to a different space`, async () => {

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';
      const id = 'object_2';
      const options = {};

      await expect(client.get(type, id, options)).rejects.toThrowErrorMatchingSnapshot();
    });
  });

  describe('#bulk_get', () => {
    test(`only returns objects belonging to the current space`, async () => {

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';
      const options = {};

      const result = await client.bulkGet([{
        type,
        id: 'object_0'
      }, {
        type,
        id: 'object_2'
      }], options);

      expect(result).toEqual({
        saved_objects: [{
          id: 'object_0',
          type: 'foo',
        }, {
          id: 'object_2',
          type: 'foo',
          error: {
            message: 'Not found',
            statusCode: 404
          }
        }]
      });
    });

    test(`returns global objects that don't belong to a specific space`, async () => {
      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';
      const options = {};

      const result = await client.bulkGet([{
        type,
        id: 'object_0'
      }, {
        type,
        id: 'space_1'
      }], options);

      expect(result).toEqual({
        saved_objects: [{
          id: 'object_0',
          type: 'foo',
        }, {
          id: 'space_1',
          type: 'space',
        }]
      });
    });

    test(`merges options.extraDocumentProperties`, async () => {
      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';

      const objects = [{
        type,
        id: 'object_1'
      }, {
        type,
        id: 'object_2'
      }];

      const options = {
        extraDocumentProperties: ['otherSourceProp']
      };

      await client.bulkGet(objects, options);

      expect(baseClient.bulkGet).toHaveBeenCalledWith(objects, {
        extraDocumentProperties: ['spaceId', 'type', 'otherSourceProp']
      });
    });
  });

  describe('#find', () => {
    test(`creates ES query filters restricting objects to the current space`, async () => {

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';
      const options = {
        type
      };

      await client.find(options);

      expect(baseClient.find).toHaveBeenCalledWith({
        type,
        filters: [{
          bool: {
            minimum_should_match: 1,
            should: [{
              bool: {
                must: [{
                  term: {
                    type
                  },
                }],
                must_not: [{
                  exists: {
                    field: "spaceId"
                  }
                }]
              }
            }]
          }
        }]
      });
    });

    test(`merges incoming filters with filters generated by Spaces Saved Objects Client`, async () => {
      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';
      const otherFilters = [{
        bool: {
          must: [{
            term: {
              foo: 'bar'
            }
          }]
        }
      }];

      const options = {
        type,
        filters: otherFilters
      };

      await client.find(options);

      expect(baseClient.find).toHaveBeenCalledWith({
        type,
        filters: [...otherFilters, {
          bool: {
            minimum_should_match: 1,
            should: [{
              bool: {
                must: [{
                  term: {
                    type
                  },
                }],
                must_not: [{
                  exists: {
                    field: "spaceId"
                  }
                }]
              }
            }]
          }
        }]
      });
    });
  });

  describe('#create', () => {

    test('does not assign a space-unaware (global) object to a space', async () => {

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'space';
      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };

      await client.create(type, attributes);

      expect(baseClient.create).toHaveBeenCalledWith(type, attributes, { extraDocumentProperties: {} });
    });

    test('does not assign a spaceId to space-aware objects belonging to the default space', async () => {

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';
      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };

      await client.create(type, attributes);

      // called without extraDocumentProperties
      expect(baseClient.create).toHaveBeenCalledWith(type, attributes, { extraDocumentProperties: {} });
    });
  });

  describe('#bulk_create', () => {
    test('allows for bulk creation when all types are space-aware', async () => {

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });


      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };
      const objects = [{
        type: 'foo',
        attributes
      }, {
        type: 'bar',
        attributes
      }];

      await client.bulkCreate(objects, {});

      const expectedCalledWithObjects = objects.map(object => ({
        ...object,
        extraDocumentProperties: {}
      }));

      expect(baseClient.bulkCreate).toHaveBeenCalledWith(expectedCalledWithObjects, {});
    });

    test('allows for bulk creation when all types are not space-aware (global)', async () => {

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };

      const objects = [{
        type: 'space',
        attributes
      }, {
        type: 'space',
        attributes
      }];

      await client.bulkCreate(objects, {});

      expect(baseClient.bulkCreate).toHaveBeenCalledWith(objects.map(o => {
        return { ...o, extraDocumentProperties: {} };
      }), {});
    });

    test('allows space-aware and non-space-aware (global) objects to be created at the same time', async () => {

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };

      const objects = [{
        type: 'space',
        attributes
      }, {
        type: 'foo',
        attributes
      }];

      await client.bulkCreate(objects, {});

      const expectedCalledWithObjects = [...objects];
      expectedCalledWithObjects[0] = {
        ...expectedCalledWithObjects[0],
        extraDocumentProperties: {}
      };
      expectedCalledWithObjects[1] = {
        ...expectedCalledWithObjects[1],
        extraDocumentProperties: {}
      };

      expect(baseClient.bulkCreate).toHaveBeenCalledWith(expectedCalledWithObjects, {});
    });

    test('does not assign a spaceId to space-aware objects that belong to the default space', async () => {

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });


      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };
      const objects = [{
        type: 'foo',
        attributes
      }, {
        type: 'bar',
        attributes
      }];

      await client.bulkCreate(objects, {});

      // called with empty extraDocumentProperties
      expect(baseClient.bulkCreate).toHaveBeenCalledWith(objects.map(o => ({
        ...o,
        extraDocumentProperties: {}
      })), {});
    });
  });

  describe('#update', () => {
    test('allows an object to be updated if it exists in the same space', async () => {

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const id = 'object_0';
      const type = 'foo';
      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };

      await client.update(type, id, attributes);

      expect(baseClient.update).toHaveBeenCalledWith(type, id, attributes, { extraDocumentProperties: {} });
    });

    test('allows a global object to be updated', async () => {
      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const id = 'space_1';
      const type = 'space';
      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };

      await client.update(type, id, attributes);

      expect(baseClient.update).toHaveBeenCalledWith(type, id, attributes, { extraDocumentProperties: {} });
    });

    test('does not allow an object to be updated via a different space', async () => {

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const id = 'object_2';
      const type = 'foo';
      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };

      await expect(client.update(type, id, attributes)).rejects.toThrowErrorMatchingSnapshot();
    });
  });

  describe('#delete', () => {
    test('allows an object to be deleted if it exists in the same space', async () => {

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const id = 'object_0';
      const type = 'foo';

      await client.delete(type, id);

      expect(baseClient.delete).toHaveBeenCalledWith(type, id);
    });

    test(`allows a global object to be deleted`, async () => {
      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const id = 'space_1';
      const type = 'space';

      await client.delete(type, id);

      expect(baseClient.delete).toHaveBeenCalledWith(type, id);
    });

    test('does not allow an object to be deleted via a different space', async () => {

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const id = 'object_2';
      const type = 'foo';

      await expect(client.delete(type, id)).rejects.toThrowErrorMatchingSnapshot();
    });
  });
});

describe('current space (space_1)', () => {
  const currentSpace = {
    id: 'space_1',
    urlContext: 'space-1'
  };

  describe('#get', () => {
    test(`returns the object when it belongs to the current space`, async () => {

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';
      const id = 'object_1';
      const options = {};

      const result = await client.get(type, id, options);

      expect(result).toBe(SAVED_OBJECTS[id]);
    });

    test(`returns global objects that don't belong to a specific space`, async () => {
      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'space';
      const id = 'space_1';
      const options = {};

      const result = await client.get(type, id, options);

      expect(result).toBe(SAVED_OBJECTS[id]);
    });

    test(`merges options.extraDocumentProperties`, async () => {

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';
      const id = 'object_1';
      const options = {
        extraDocumentProperties: ['otherSourceProp']
      };

      await client.get(type, id, options);

      expect(baseClient.get).toHaveBeenCalledWith(type, id, {
        extraDocumentProperties: ['spaceId', 'otherSourceProp']
      });
    });

    test(`returns error when the object belongs to a different space`, async () => {

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';
      const id = 'object_2';
      const options = {};

      await expect(client.get(type, id, options)).rejects.toThrowErrorMatchingSnapshot();
    });
  });

  describe('#bulk_get', () => {
    test(`only returns objects belonging to the current space`, async () => {

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';
      const options = {};

      const result = await client.bulkGet([{
        type,
        id: 'object_1'
      }, {
        type,
        id: 'object_2'
      }], options);

      expect(result).toEqual({
        saved_objects: [{
          id: 'object_1',
          spaceId: 'space_1',
          type: 'foo',
        }, {
          id: 'object_2',
          type: 'foo',
          error: {
            message: 'Not found',
            statusCode: 404
          }
        }]
      });
    });

    test(`returns global objects that don't belong to a specific space`, async () => {
      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';
      const options = {};

      const result = await client.bulkGet([{
        type,
        id: 'object_1'
      }, {
        type,
        id: 'space_1'
      }], options);

      expect(result).toEqual({
        saved_objects: [{
          id: 'object_1',
          spaceId: 'space_1',
          type: 'foo',
        }, {
          id: 'space_1',
          type: 'space',
        }]
      });
    });

    test(`merges options.extraDocumentProperties`, async () => {
      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';

      const objects = [{
        type,
        id: 'object_1'
      }, {
        type,
        id: 'object_2'
      }];

      const options = {
        extraDocumentProperties: ['otherSourceProp']
      };

      await client.bulkGet(objects, options);

      expect(baseClient.bulkGet).toHaveBeenCalledWith(objects, {
        extraDocumentProperties: ['spaceId', 'type', 'otherSourceProp']
      });
    });
  });

  describe('#find', () => {
    test(`creates ES query filters restricting objects to the current space`, async () => {

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';
      const options = {
        type
      };

      await client.find(options);

      expect(baseClient.find).toHaveBeenCalledWith({
        type,
        filters: [{
          bool: {
            minimum_should_match: 1,
            should: [{
              bool: {
                must: [{
                  term: {
                    type
                  },
                }, {
                  term: {
                    spaceId: 'space_1'
                  }
                }],
              }
            }]
          }
        }]
      });
    });

    test(`merges incoming filters with filters generated by Spaces Saved Objects Client`, async () => {
      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';
      const otherFilters = [{
        bool: {
          must: [{
            term: {
              foo: 'bar'
            }
          }]
        }
      }];

      const options = {
        type,
        filters: otherFilters
      };

      await client.find(options);

      expect(baseClient.find).toHaveBeenCalledWith({
        type,
        filters: [...otherFilters, {
          bool: {
            minimum_should_match: 1,
            should: [{
              bool: {
                must: [{
                  term: {
                    type
                  },
                }, {
                  term: {
                    spaceId: 'space_1'
                  }
                }]
              }
            }]
          }
        }]
      });
    });
  });

  describe('#create', () => {
    test('automatically assigns the object to the current space via extraDocumentProperties', async () => {

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'foo';
      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };

      await client.create(type, attributes);

      expect(baseClient.create).toHaveBeenCalledWith(type, attributes, {
        extraDocumentProperties: {
          spaceId: 'space_1'
        }
      });
    });

    test('does not assign a space-unaware (global) object to a space', async () => {

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService(server);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const type = 'space';
      const attributes = {
        prop1: 'value 1',
        prop2: 'value 2'
      };

      await client.create(type, attributes);

      expect(baseClient.create).toHaveBeenCalledWith(type, attributes, { extraDocumentProperties: {} });
    });

    describe('#bulk_create', () => {
      test('allows for bulk creation when all types are space-aware', async () => {

        const request = createMockRequest(currentSpace);
        const baseClient = createMockClient(currentSpace);
        const spacesService = createSpacesService(server);

        const client = new SpacesSavedObjectsClient({
          request,
          baseClient,
          spacesService,
          types: [],
        });


        const attributes = {
          prop1: 'value 1',
          prop2: 'value 2'
        };
        const objects = [{
          type: 'foo',
          attributes
        }, {
          type: 'bar',
          attributes
        }];

        await client.bulkCreate(objects, {});

        const expectedCalledWithObjects = objects.map(object => ({
          ...object,
          extraDocumentProperties: {
            spaceId: 'space_1'
          }
        }));

        expect(baseClient.bulkCreate).toHaveBeenCalledWith(expectedCalledWithObjects, {});
      });

      test('allows for bulk creation when all types are not space-aware', async () => {

        const request = createMockRequest(currentSpace);
        const baseClient = createMockClient(currentSpace);
        const spacesService = createSpacesService(server);

        const client = new SpacesSavedObjectsClient({
          request,
          baseClient,
          spacesService,
          types: [],
        });

        const attributes = {
          prop1: 'value 1',
          prop2: 'value 2'
        };

        const objects = [{
          type: 'space',
          attributes
        }, {
          type: 'space',
          attributes
        }];

        await client.bulkCreate(objects, {});

        expect(baseClient.bulkCreate).toHaveBeenCalledWith(objects.map(o => {
          return { ...o, extraDocumentProperties: {} };
        }), {});
      });

      test('allows space-aware and non-space-aware (global) objects to be created at the same time', async () => {

        const request = createMockRequest(currentSpace);
        const baseClient = createMockClient(currentSpace);
        const spacesService = createSpacesService(server);

        const client = new SpacesSavedObjectsClient({
          request,
          baseClient,
          spacesService,
          types: [],
        });

        const attributes = {
          prop1: 'value 1',
          prop2: 'value 2'
        };

        const objects = [{
          type: 'space',
          attributes
        }, {
          type: 'foo',
          attributes
        }];

        await client.bulkCreate(objects, {});

        const expectedCalledWithObjects = [...objects];
        expectedCalledWithObjects[0] = {
          ...expectedCalledWithObjects[0],
          extraDocumentProperties: {}
        };
        expectedCalledWithObjects[1] = {
          ...expectedCalledWithObjects[1],
          extraDocumentProperties: {
            spaceId: 'space_1'
          }
        };

        expect(baseClient.bulkCreate).toHaveBeenCalledWith(expectedCalledWithObjects, {});
      });
    });

    describe('#update', () => {
      test('allows an object to be updated if it exists in the same space', async () => {

        const request = createMockRequest(currentSpace);
        const baseClient = createMockClient(currentSpace);
        const spacesService = createSpacesService(server);

        const client = new SpacesSavedObjectsClient({
          request,
          baseClient,
          spacesService,
          types: [],
        });

        const id = 'object_1';
        const type = 'foo';
        const attributes = {
          prop1: 'value 1',
          prop2: 'value 2'
        };

        await client.update(type, id, attributes);

        expect(baseClient.update).toHaveBeenCalledWith(type, id, attributes, { extraDocumentProperties: { spaceId: 'space_1' } });
      });

      test('allows a global object to be updated', async () => {
        const request = createMockRequest(currentSpace);
        const baseClient = createMockClient(currentSpace);
        const spacesService = createSpacesService(server);

        const client = new SpacesSavedObjectsClient({
          request,
          baseClient,
          spacesService,
          types: [],
        });

        const id = 'space_1';
        const type = 'space';
        const attributes = {
          prop1: 'value 1',
          prop2: 'value 2'
        };

        await client.update(type, id, attributes);

        expect(baseClient.update).toHaveBeenCalledWith(type, id, attributes, { extraDocumentProperties: {} });
      });

      test('does not allow an object to be updated via a different space', async () => {

        const request = createMockRequest(currentSpace);
        const baseClient = createMockClient(currentSpace);
        const spacesService = createSpacesService(server);

        const client = new SpacesSavedObjectsClient({
          request,
          baseClient,
          spacesService,
          types: [],
        });

        const id = 'object_2';
        const type = 'foo';
        const attributes = {
          prop1: 'value 1',
          prop2: 'value 2'
        };

        await expect(client.update(type, id, attributes)).rejects.toThrowErrorMatchingSnapshot();
      });
    });

    describe('#delete', () => {
      test('allows an object to be deleted if it exists in the same space', async () => {
        const request = createMockRequest(currentSpace);
        const baseClient = createMockClient(currentSpace);
        const spacesService = createSpacesService(server);

        const client = new SpacesSavedObjectsClient({
          request,
          baseClient,
          spacesService,
          types: [],
        });

        const id = 'object_1';
        const type = 'foo';

        await client.delete(type, id);

        expect(baseClient.delete).toHaveBeenCalledWith(type, id);
      });

      test('allows a global object to be deleted', async () => {
        const request = createMockRequest(currentSpace);
        const baseClient = createMockClient(currentSpace);
        const spacesService = createSpacesService(server);

        const client = new SpacesSavedObjectsClient({
          request,
          baseClient,
          spacesService,
          types: [],
        });

        const id = 'space_1';
        const type = 'space';

        await client.delete(type, id);

        expect(baseClient.delete).toHaveBeenCalledWith(type, id);
      });

      test('does not allow an object to be deleted via a different space', async () => {

        const request = createMockRequest(currentSpace);
        const baseClient = createMockClient(currentSpace);
        const spacesService = createSpacesService(server);

        const client = new SpacesSavedObjectsClient({
          request,
          baseClient,
          spacesService,
          types: [],
        });

        const id = 'object_2';
        const type = 'foo';

        await expect(client.delete(type, id)).rejects.toThrowErrorMatchingSnapshot();
      });
    });
  });
});
