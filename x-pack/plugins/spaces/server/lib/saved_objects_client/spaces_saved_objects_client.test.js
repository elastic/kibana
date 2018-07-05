/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesSavedObjectsClient } from './spaces_saved_objects_client';
import { createSpacesService } from '../create_spaces_service';
import { DEFAULT_SPACE_ID } from '../../../common/constants';

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
        saved_objects: objects.map(o => SAVED_OBJECTS[o.id])
      };
    }),
    find: jest.fn(({ type }) => {
      // used to locate spaces when type is `space` within these tests
      if (type === 'space') {
        return {
          saved_objects: [space]
        };
      }
      throw new Error(`not implemented`);
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

    expect(result).toBe(SAVED_OBJECTS[id]);
  });

  test(`merges options.extraSourceProperties`, async () => {
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
      extraSourceProperties: ['otherSourceProp']
    };

    await client.get(type, id, options);

    expect(baseClient.get).toHaveBeenCalledWith(type, id, {
      extraSourceProperties: ['spaceId', 'otherSourceProp']
    });
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

  test(`merges options.extraSourceProperties`, async () => {
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
      extraSourceProperties: ['otherSourceProp']
    };

    await client.bulkGet(objects, options);

    expect(baseClient.bulkGet).toHaveBeenCalledWith(objects, {
      extraSourceProperties: ['spaceId', 'type', 'otherSourceProp']
    });
  });
});

describe('#create', () => {
  test('automatically assigns the object to the current space via extraBodyProperties', async () => {
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

    await client.create(type, attributes);

    expect(baseClient.create).toHaveBeenCalledWith(type, attributes, {
      extraBodyProperties: {
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

    await client.create(type, attributes);

    expect(baseClient.create).toHaveBeenCalledWith(type, attributes, {});
  });

  test('does not assign a spaceId to space-aware objects belonging to the default space', async () => {
    const currentSpace = {
      id: DEFAULT_SPACE_ID,
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

    await client.create(type, attributes);

    // called without extraBodyProperties
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

    await client.bulkCreate(objects, {});

    const expectedCalledWithObjects = objects.map(o => ({
      ...o,
      extraBodyProperties: {
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

    await client.bulkCreate(objects, {});

    expect(baseClient.bulkCreate).toHaveBeenCalledWith(objects, {});
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

    await client.bulkCreate(objects, {});

    const expectedCalledWithObjects = [...objects];
    expectedCalledWithObjects[1] = {
      ...expectedCalledWithObjects[1],
      extraBodyProperties: {
        spaceId: 'space_1'
      }
    };

    expect(baseClient.bulkCreate).toHaveBeenCalledWith(expectedCalledWithObjects, {});
  });

  test('does not assign a spaceId to space-aware objects that belong to the default space', async () => {
    const currentSpace = {
      id: DEFAULT_SPACE_ID,
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

    await client.bulkCreate(objects, {});

    // called without extraBodyProperties
    expect(baseClient.bulkCreate).toHaveBeenCalledWith(objects, {});
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

    await client.update(type, id, attributes);

    expect(baseClient.update).toHaveBeenCalledWith(type, id, attributes, { extraBodyProperties: { spaceId: 'space_1' } });
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

    await expect(client.update(type, id, attributes)).rejects.toThrowErrorMatchingSnapshot();
  });

  test('allows an object to be updated within the default space', async () => {
    const currentSpace = {
      id: DEFAULT_SPACE_ID,
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

    expect(baseClient.update).toHaveBeenCalledWith(type, id, attributes, {});
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

    expect(baseClient.delete).toHaveBeenCalledWith(type, id);
  });

  test('allows an object to be deleted from the default space', async () => {
    const currentSpace = {
      id: DEFAULT_SPACE_ID,
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
