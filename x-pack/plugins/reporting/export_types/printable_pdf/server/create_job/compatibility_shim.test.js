/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compatibilityShimFactory } from './compatibility_shim';

const createMockServer = () => {
  return {
    expose: jest.fn(), //fool once_per_server
    log: jest.fn()
  };
};

const createMockRequest = () => {
  const mockSavedObjectsClient = {
    get: jest.fn(),
  };

  return {
    async getSavedObjectsClient() { return mockSavedObjectsClient; },
  };
};

test(`passes title through if provided`, async () => {
  const compatibilityShim = compatibilityShimFactory(createMockServer());
  const title = 'test title';

  const createJobMock = jest.fn();
  await compatibilityShim(createJobMock)({ title, relativeUrl: '/something' }, null, createMockRequest());

  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][0].title).toBe(title);
});


test(`gets the title from the savedObject`, async () => {
  const compatibilityShim = compatibilityShimFactory(createMockServer());

  const createJobMock = jest.fn();
  const mockRequest = createMockRequest();
  const title = 'savedTitle';
  const mockSavedObjectsClient = await mockRequest.getSavedObjectsClient();
  mockSavedObjectsClient.get.mockReturnValue({
    attributes: {
      title
    }
  });

  await compatibilityShim(createJobMock)({ objectType: 'search', savedObjectId: 'abc' }, null, mockRequest);

  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][0].title).toBe(title);
});

test(`passes the objectType and savedObjectId to the savedObjectsClient`, async () => {
  const compatibilityShim = compatibilityShimFactory(createMockServer());

  const createJobMock = jest.fn();
  const mockRequest = createMockRequest();
  const mockSavedObjectsClient = await mockRequest.getSavedObjectsClient();
  mockSavedObjectsClient.get.mockReturnValue({
    attributes: {
      title: ''
    }
  });

  const objectType = 'search';
  const savedObjectId = 'abc';
  await compatibilityShim(createJobMock)({ objectType, savedObjectId, }, null, mockRequest);

  const getMock = mockSavedObjectsClient.get.mock;
  expect(getMock.calls.length).toBe(1);
  expect(getMock.calls[0][0]).toBe(objectType);
  expect(getMock.calls[0][1]).toBe(savedObjectId);
});

test(`logs deprecations when generating the title/relativeUrl using the savedObject`, async () => {
  const mockServer = createMockServer();
  const compatibilityShim = compatibilityShimFactory(mockServer);

  const createJobMock = jest.fn();
  const mockRequest = createMockRequest();
  const mockSavedObjectsClient = await mockRequest.getSavedObjectsClient();
  mockSavedObjectsClient.get.mockReturnValue({
    attributes: {
      title: ''
    }
  });

  await compatibilityShim(createJobMock)({ objectType: 'search', savedObjectId: 'abc' }, null, mockRequest);

  expect(mockServer.log.mock.calls.length).toBe(2);
  expect(mockServer.log.mock.calls[0][0]).toEqual(['warning', 'reporting', 'deprecation']);
  expect(mockServer.log.mock.calls[1][0]).toEqual(['warning', 'reporting', 'deprecation']);
});

test(`passes objectType through`, async () => {
  const compatibilityShim = compatibilityShimFactory(createMockServer());

  const createJobMock = jest.fn();
  const mockRequest = createMockRequest();

  const objectType = 'foo';
  await compatibilityShim(createJobMock)({ title: 'test', relativeUrl: '/something', objectType }, null, mockRequest);

  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][0].objectType).toBe(objectType);
});

test(`passes the relativeUrls through`, async () => {
  const compatibilityShim = compatibilityShimFactory(createMockServer());

  const createJobMock = jest.fn();
  const mockRequest = createMockRequest();

  const relativeUrls = ['/app/kibana#something', '/app/kibana#something-else'];
  await compatibilityShim(createJobMock)({ title: 'test', relativeUrls }, null, mockRequest);
  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][0].relativeUrls).toBe(relativeUrls);
});

const testSavedObjectRelativeUrl = (objectType, expectedUrl) => {
  test(`generates the saved object relativeUrl for ${objectType}`, async () => {
    const compatibilityShim = compatibilityShimFactory(createMockServer());
    const createJobMock = jest.fn();
    const mockRequest = createMockRequest();

    await compatibilityShim(createJobMock)({ title: 'test', objectType, savedObjectId: 'abc', }, null, mockRequest);
    expect(createJobMock.mock.calls.length).toBe(1);
    expect(createJobMock.mock.calls[0][0].relativeUrls).toEqual([expectedUrl]);
  });
};

testSavedObjectRelativeUrl('search', '/app/kibana#/discover/abc?');
testSavedObjectRelativeUrl('visualization', '/app/kibana#/visualize/edit/abc?');
testSavedObjectRelativeUrl('dashboard', '/app/kibana#/dashboard/abc?');

test(`appends the queryString to the relativeUrl when generating from the savedObject`, async () => {
  const compatibilityShim = compatibilityShimFactory(createMockServer());
  const createJobMock = jest.fn();
  const mockRequest = createMockRequest();

  await compatibilityShim(createJobMock)(
    { title: 'test', objectType: 'search', savedObjectId: 'abc', queryString: 'foo=bar' }, null, mockRequest
  );
  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][0].relativeUrls).toEqual(['/app/kibana#/discover/abc?foo=bar']);
});

test(`throw an Error if the objectType, savedObjectId and relativeUrls are provided`, async () => {
  const compatibilityShim = compatibilityShimFactory(createMockServer());
  const createJobMock = jest.fn();
  const mockRequest = createMockRequest();

  const promise = compatibilityShim(createJobMock)({
    title: 'test',
    objectType: 'something',
    relativeUrls: ['/something'],
    savedObjectId: 'abc',
  }, null, mockRequest);

  await expect(promise).rejects.toBeDefined();
});

test(`passes headers and request through`, async () => {
  const compatibilityShim = compatibilityShimFactory(createMockServer());

  const createJobMock = jest.fn();

  const headers = {};
  const request = createMockRequest();

  await compatibilityShim(createJobMock)({ title: 'test', relativeUrl: '/something' }, headers, request);

  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][1]).toBe(headers);
  expect(createJobMock.mock.calls[0][2]).toBe(request);
});
