/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { once } from 'lodash';
import { compatibilityShimFactory } from './compatibility_shim';

const createMockServer = () => {
  return {
    expose: jest.fn(), //fool once_per_server
    log: jest.fn()
  };
};

const createMockRequest = () => {
  return {
    getSavedObjectsClient: once(function () {
      return {
        get: jest.fn()
      };
    })
  };
};

test(`passes title through if provided`, async () => {
  const compatibilityShim = compatibilityShimFactory(createMockServer());
  const title = 'test title';

  const createJobMock = jest.fn();
  await compatibilityShim(createJobMock)({ title, relativeUrl: '/something' }, null, null, createMockRequest());

  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][0].title).toBe(title);
});


test(`gets the title from the savedObject`, async () => {
  const compatibilityShim = compatibilityShimFactory(createMockServer());

  const createJobMock = jest.fn();
  const mockRequest = createMockRequest();
  const title = 'savedTitle';
  mockRequest.getSavedObjectsClient().get.mockReturnValue({
    attributes: {
      title
    }
  });

  await compatibilityShim(createJobMock)({ objectType: 'search', savedObjectId: 'abc' }, null, null, mockRequest);

  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][0].title).toBe(title);
});

test(`passes the objectType and savedObjectId to the savedObjectsClient`, async () => {
  const compatibilityShim = compatibilityShimFactory(createMockServer());

  const createJobMock = jest.fn();
  const mockRequest = createMockRequest();
  mockRequest.getSavedObjectsClient().get.mockReturnValue({
    attributes: {
      title: ''
    }
  });

  const objectType = 'search';
  const savedObjectId = 'abc';
  await compatibilityShim(createJobMock)({ objectType, savedObjectId, }, null, null, mockRequest);

  const getMock = mockRequest.getSavedObjectsClient().get.mock;
  expect(getMock.calls.length).toBe(1);
  expect(getMock.calls[0][0]).toBe(objectType);
  expect(getMock.calls[0][1]).toBe(savedObjectId);
});

test(`logs deprecations when generating the title/relativeUrl using the savedObject`, async () => {
  const mockServer = createMockServer();
  const compatibilityShim = compatibilityShimFactory(mockServer);

  const createJobMock = jest.fn();
  const mockRequest = createMockRequest();
  mockRequest.getSavedObjectsClient().get.mockReturnValue({
    attributes: {
      title: ''
    }
  });

  await compatibilityShim(createJobMock)({ objectType: 'search', savedObjectId: 'abc' }, null, null, mockRequest);

  expect(mockServer.log.mock.calls.length).toBe(2);
  expect(mockServer.log.mock.calls[0][0]).toEqual(['warning', 'reporting', 'deprecation']);
  expect(mockServer.log.mock.calls[1][0]).toEqual(['warning', 'reporting', 'deprecation']);
});

test(`passes objectType through`, async () => {
  const compatibilityShim = compatibilityShimFactory(createMockServer());

  const createJobMock = jest.fn();
  const mockRequest = createMockRequest();

  const objectType = 'foo';
  await compatibilityShim(createJobMock)({ title: 'test', relativeUrl: '/something', objectType }, null, null, mockRequest);

  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][0].objectType).toBe(objectType);
});

test(`passes the relativeUrls through`, async () => {
  const compatibilityShim = compatibilityShimFactory(createMockServer());

  const createJobMock = jest.fn();

  const relativeUrls = ['/app/kibana#something', '/app/kibana#something-else'];
  await compatibilityShim(createJobMock)({ title: 'test', relativeUrls }, null, null, null);
  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][0].relativeUrls).toBe(relativeUrls);
});

const testSavedObjectRelativeUrl = (objectType, expectedUrl) => {
  test(`generates the saved object relativeUrl for ${objectType}`, async () => {
    const compatibilityShim = compatibilityShimFactory(createMockServer());
    const createJobMock = jest.fn();

    await compatibilityShim(createJobMock)({ title: 'test', objectType, savedObjectId: 'abc', }, null, null, null);
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

  await compatibilityShim(createJobMock)(
    { title: 'test', objectType: 'search', savedObjectId: 'abc', queryString: 'foo=bar' },
    null, null, null
  );
  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][0].relativeUrls).toEqual(['/app/kibana#/discover/abc?foo=bar']);
});

test(`throw an Error if the objectType, savedObjectId and relativeUrls are provided`, async () => {
  const compatibilityShim = compatibilityShimFactory(createMockServer());
  const createJobMock = jest.fn();

  const promise = compatibilityShim(createJobMock)({
    title: 'test',
    objectType: 'something',
    relativeUrls: ['/something'],
    savedObjectId: 'abc',
  }, null, null, null);

  await expect(promise).rejects.toThrowErrorMatchingSnapshot();
});

test(`passes headers, serializedSession and request through`, async () => {
  const compatibilityShim = compatibilityShimFactory(createMockServer());

  const createJobMock = jest.fn();

  const headers = {};
  const serializedSession = 'thisoldeserializedsession';
  const request = createMockRequest();

  await compatibilityShim(createJobMock)({ title: 'test', relativeUrl: '/something' }, headers, serializedSession, request);

  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][1]).toBe(headers);
  expect(createJobMock.mock.calls[0][2]).toBe(serializedSession);
  expect(createJobMock.mock.calls[0][3]).toBe(request);
});
