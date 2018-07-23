/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesSavedObjectsClient } from './spaces_saved_objects_client';
import { createSpacesService } from '../create_spaces_service';

jest.mock('uuid', () => ({
  v1: jest.fn(() => `mock-id`)
}));

const createObjectEntry = (type, id, spaceId) => ({
  [id]: {
    id,
    type,
    spaceId
  }
});

const SAVED_OBJECTS = {
  ...createObjectEntry('foo', 'object_0'),
  ...createObjectEntry('foo', 'space_1:object_1', 'space_1'),
  ...createObjectEntry('foo', 'space_2:object_2', 'space_2'),
};

const createMockRequest = (space) => ({
  getBasePath: () => space.urlContext ? `/s/${space.urlContext}` : '',
});

const createMockClient = (space) => {
  return {
    get: jest.fn((type, id) => {
      const object = SAVED_OBJECTS[id];
      if (!object) {
        throw new Error(`object not found: ${id}`);
      }
      return object;
    }),
    bulkGet: jest.fn((objects) => {
      return {
        saved_objects: objects.map(o => SAVED_OBJECTS[o.id] || {
          id: o.id,
          type: o.type,
          error: {
            statusCode: 404,
            message: 'Not found'
          }
        })
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
    create: jest.fn((type, attributes, options) => ({
      id: options.id || 'some-new-id',
      type,
      attributes
    })),
    bulkCreate: jest.fn(((objects) => objects.map((o, i) => ({
      ...o,
      id: o.id || `abc-${i}`
    })))),
    update: jest.fn((type, id, attributes) => ({
      id,
      type,
      attributes
    })),
    delete: jest.fn(),
    errors: {
      createGenericNotFoundError: jest.fn(() => {
        return new Error('not found');
      })
    }
  };
};
describe('within the default space', () => {
  describe('#get', () => {
    test(`returns the object when it belongs to the default space`, async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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

    test(`returns error when the object belongs to a different space`, async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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
    test(`only returns objects belonging to the default space`, async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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
  });

  describe('#find', () => {
    test(`creates ES query filters restricting objects to the current space`, async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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
                }],
              }
            }]
          }
        }]
      });
    });
  });

  describe('#create', () => {
    test('automatically assigns the object to the default space by not using extraDocumentProperties', async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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
      const options = {};

      await client.create(type, attributes, options);

      expect(baseClient.create).toHaveBeenCalledWith(type, attributes, options);
    });

    test('does not assign a space-unaware object to a space', async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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
      const options = {};

      await client.create(type, attributes, options);

      expect(baseClient.create).toHaveBeenCalledWith(type, attributes, options);
    });
  });

  describe('#bulk_create', () => {
    test('allows for bulk creation when all types are space-aware', async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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
      const options = {};

      await client.bulkCreate(objects, options);

      expect(baseClient.bulkCreate).toHaveBeenCalledWith(objects, options);
    });

    test('allows for bulk creation when all types are not space-aware', async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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
      const options = {};

      await client.bulkCreate(objects, options);

      expect(baseClient.bulkCreate).toHaveBeenCalledWith(objects, options);
    });

    test('allows space-aware and non-space-aware objects to be created at the same time', async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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
      const options = {};

      await client.bulkCreate(objects, options);

      expect(baseClient.bulkCreate).toHaveBeenCalledWith(objects, options);
    });
  });

  describe('#update', () => {
    test('allows an object to be updated if it exists in the same space', async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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
      const options = {};

      await client.update(type, id, attributes, options);

      expect(baseClient.update).toHaveBeenCalledWith(type, id, attributes, options);
    });

    test('does not allow an object to be updated via a different space', async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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
      const options = {};

      await expect(client.update(type, id, attributes, options)).rejects.toThrowErrorMatchingSnapshot();
    });
  });

  describe('#delete', () => {
    test('allows an object to be deleted if it exists in the same space', async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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

    test('does not allow an object to be deleted via a different space', async () => {
      const currentSpace = {
        id: 'default',
        urlContext: ''
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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

describe('within a space', () => {
  describe('#get', () => {
    test(`returns the object when it belongs to the current space`, async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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

      expect(result).toEqual({ "id": "object_1", "spaceId": "space_1", "type": "foo" });
    });

    test(`returns error when the object belongs to a different space`, async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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

    test(`merges options.extraDocumentProperties`, async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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

      expect(baseClient.get).toHaveBeenCalledWith(type, `space_1:${id}`, {
        extraDocumentProperties: ['spaceId', 'otherSourceProp']
      });
    });
  });

  describe('#bulk_get', () => {
    test(`only returns objects belonging to the current space`, async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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

    test(`merges options.extraDocumentProperties`, async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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

      const expectedCalledWithObjects = objects.map(obj => ({
        ...obj,
        id: `space_1:${obj.id}`
      }));

      expect(baseClient.bulkGet).toHaveBeenCalledWith(expectedCalledWithObjects, {
        extraDocumentProperties: ['spaceId', 'type', 'otherSourceProp']
      });
    });
  });

  describe('#find', () => {
    test(`creates ES query filters restricting objects to the current space`, async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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
                }]
              }
            }]
          }
        }]
      });
    });

    test(`merges incoming filters with filters generated by Spaces Saved Objects Client`, async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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
      const options = {};

      await client.create(type, attributes, options);

      expect(baseClient.create).toHaveBeenCalledWith(type, attributes, {
        id: 'space_1:mock-id',
        extraDocumentProperties: {
          spaceId: 'space_1'
        }
      });
    });

    test('does not assign a space-unaware object to a space', async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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
      const options = {};

      await client.create(type, attributes, options);

      expect(baseClient.create).toHaveBeenCalledWith(type, attributes, {});
    });
  });

  describe('#bulk_create', () => {
    test('allows for bulk creation when all types are space-aware', async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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
      const options = {};

      await client.bulkCreate(objects, options);

      const expectedCalledWithObjects = objects.map(o => ({
        ...o,
        id: `space_1:mock-id`,
        extraDocumentProperties: {
          spaceId: 'space_1'
        }
      }));

      expect(baseClient.bulkCreate).toHaveBeenCalledWith(expectedCalledWithObjects, {});
    });

    test('allows for bulk creation when all types are not space-aware', async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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

      const options = {};

      await client.bulkCreate(objects, options);

      expect(baseClient.bulkCreate).toHaveBeenCalledWith(objects, options);
    });

    test('allows space-aware and non-space-aware objects to be created at the same time', async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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
      const options = {};

      await client.bulkCreate(objects, options);

      const expectedCalledWithObjects = [...objects];
      expectedCalledWithObjects[1] = {
        ...expectedCalledWithObjects[1],
        id: `space_1:mock-id`,
        extraDocumentProperties: {
          spaceId: 'space_1'
        }
      };

      expect(baseClient.bulkCreate).toHaveBeenCalledWith(expectedCalledWithObjects, options);
    });
  });

  describe('#update', () => {
    test('allows an object to be updated if it exists in the same space', async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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
      const options = {};

      await client.update(type, id, attributes, options);

      expect(baseClient.update)
        .toHaveBeenCalledWith(type, `space_1:${id}`, attributes, { extraDocumentProperties: { spaceId: 'space_1' } });
    });

    test('does not allow an object to be updated via a different space', async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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
      const options = {};

      await expect(client.update(type, id, attributes, options)).rejects.toThrowErrorMatchingSnapshot();
    });
  });

  describe('#delete', () => {
    test('allows an object to be deleted if it exists in the same space', async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        spacesService,
        types: [],
      });

      const id = 'object_1';
      const type = 'foo';

      await client.delete(type, id);

      expect(baseClient.delete).toHaveBeenCalledWith(type, `space_1:${id}`);
    });

    test('does not allow an object to be deleted via a different space', async () => {
      const currentSpace = {
        id: 'space_1',
        urlContext: 'space-1'
      };

      const request = createMockRequest(currentSpace);
      const baseClient = createMockClient(currentSpace);
      const spacesService = createSpacesService();

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
