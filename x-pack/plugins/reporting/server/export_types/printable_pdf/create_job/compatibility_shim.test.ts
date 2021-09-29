/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from 'src/core/server/mocks';
import { createMockLevelLogger } from '../../../test_helpers';
import { compatibilityShim } from './compatibility_shim';

const mockRequestHandlerContext = {
  core: coreMock.createRequestHandlerContext(),
  reporting: { usesUiCapabilities: () => true },
};
const mockLogger = createMockLevelLogger();

const createMockSavedObject = (body: any) => ({
  id: 'mockSavedObjectId123',
  type: 'mockSavedObjectType',
  references: [],
  ...body,
});
const createMockJobParams = (body: any) => ({
  ...body,
});

beforeEach(() => {
  jest.clearAllMocks();
});

test(`passes title through if provided`, async () => {
  const title = 'test title';

  const createJobMock = jest.fn();
  await compatibilityShim(createJobMock, mockLogger)(
    createMockJobParams({ title, relativeUrls: ['/something'] }),
    mockRequestHandlerContext
  );

  expect(mockLogger.warn.mock.calls.length).toBe(0);
  expect(mockLogger.error.mock.calls.length).toBe(0);

  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][0].title).toBe(title);
});

test(`gets the title from the savedObject`, async () => {
  const createJobMock = jest.fn();
  const title = 'savedTitle';
  mockRequestHandlerContext.core.savedObjects.client.get.mockResolvedValue(
    createMockSavedObject({
      attributes: { title },
    })
  );

  await compatibilityShim(createJobMock, mockLogger)(
    createMockJobParams({ objectType: 'search', savedObjectId: 'abc' }),
    mockRequestHandlerContext
  );

  expect(mockLogger.warn.mock.calls.length).toBe(2);
  expect(mockLogger.warn.mock.calls[0][0]).toEqual(
    'The relativeUrls have been derived from saved object parameters. This functionality will be removed with the next major version.'
  );
  expect(mockLogger.error.mock.calls.length).toBe(0);

  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][0].title).toBe(title);
});

test(`passes the objectType and savedObjectId to the savedObjectsClient`, async () => {
  const createJobMock = jest.fn();
  const context = mockRequestHandlerContext;
  context.core.savedObjects.client.get.mockResolvedValue(
    createMockSavedObject({ attributes: { title: '' } })
  );

  const objectType = 'search';
  const savedObjectId = 'abc';
  await compatibilityShim(createJobMock, mockLogger)(
    createMockJobParams({ objectType, savedObjectId }),
    context
  );

  expect(mockLogger.warn.mock.calls.length).toBe(2);
  expect(mockLogger.warn.mock.calls[0][0]).toEqual(
    'The relativeUrls have been derived from saved object parameters. This functionality will be removed with the next major version.'
  );
  expect(mockLogger.warn.mock.calls[1][0]).toEqual(
    'The title has been derived from saved object parameters. This functionality will be removed with the next major version.'
  );
  expect(mockLogger.error.mock.calls.length).toBe(0);

  const getMock = context.core.savedObjects.client.get.mock;
  expect(getMock.calls.length).toBe(1);
  expect(getMock.calls[0][0]).toBe(objectType);
  expect(getMock.calls[0][1]).toBe(savedObjectId);
});

test(`logs no warnings when title and relativeUrls is passed`, async () => {
  const createJobMock = jest.fn();

  await compatibilityShim(createJobMock, mockLogger)(
    createMockJobParams({ title: 'Phenomenal Dashboard', relativeUrls: ['/abc', '/def'] }),
    mockRequestHandlerContext
  );

  expect(mockLogger.warn.mock.calls.length).toBe(0);
  expect(mockLogger.error.mock.calls.length).toBe(0);
});

test(`logs warning if title can not be provided`, async () => {
  const createJobMock = jest.fn();
  await compatibilityShim(createJobMock, mockLogger)(
    createMockJobParams({ relativeUrls: ['/abc'] }),
    mockRequestHandlerContext
  );

  expect(mockLogger.warn.mock.calls.length).toBe(1);
  expect(mockLogger.warn.mock.calls[0][0]).toEqual(
    `A title parameter should be provided with the job generation request. Please ` +
      `use Kibana to regenerate your POST URL to have a title included in the PDF.`
  );
});

test(`logs deprecations when generating the title/relativeUrl using the savedObject`, async () => {
  const createJobMock = jest.fn();
  mockRequestHandlerContext.core.savedObjects.client.get.mockResolvedValue(
    createMockSavedObject({
      attributes: { title: '' },
    })
  );

  await compatibilityShim(createJobMock, mockLogger)(
    createMockJobParams({ objectType: 'search', savedObjectId: 'abc' }),
    mockRequestHandlerContext
  );

  expect(mockLogger.warn.mock.calls.length).toBe(2);
  expect(mockLogger.warn.mock.calls[0][0]).toEqual(
    'The relativeUrls have been derived from saved object parameters. This functionality will be removed with the next major version.'
  );
  expect(mockLogger.warn.mock.calls[1][0]).toEqual(
    'The title has been derived from saved object parameters. This functionality will be removed with the next major version.'
  );
});

test(`passes objectType through`, async () => {
  const createJobMock = jest.fn();

  const objectType = 'foo';
  await compatibilityShim(createJobMock, mockLogger)(
    createMockJobParams({ title: 'test', relativeUrls: ['/something'], objectType }),
    mockRequestHandlerContext
  );

  expect(mockLogger.warn.mock.calls.length).toBe(0);
  expect(mockLogger.error.mock.calls.length).toBe(0);

  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][0].objectType).toBe(objectType);
});

test(`passes the relativeUrls through`, async () => {
  const createJobMock = jest.fn();

  const relativeUrls = ['/app/kibana#something', '/app/kibana#something-else'];
  await compatibilityShim(createJobMock, mockLogger)(
    createMockJobParams({ title: 'test', relativeUrls }),
    mockRequestHandlerContext
  );

  expect(mockLogger.warn.mock.calls.length).toBe(0);
  expect(mockLogger.error.mock.calls.length).toBe(0);

  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][0].relativeUrls).toBe(relativeUrls);
});

const testSavedObjectRelativeUrl = (objectType: string, expectedUrl: string) => {
  test(`generates the saved object relativeUrl for ${objectType}`, async () => {
    const createJobMock = jest.fn();

    await compatibilityShim(createJobMock, mockLogger)(
      createMockJobParams({ title: 'test', objectType, savedObjectId: 'abc' }),
      mockRequestHandlerContext
    );

    expect(mockLogger.warn.mock.calls.length).toBe(1);
    expect(mockLogger.warn.mock.calls[0][0]).toEqual(
      'The relativeUrls have been derived from saved object parameters. This functionality will be removed with the next major version.'
    );
    expect(mockLogger.error.mock.calls.length).toBe(0);

    expect(createJobMock.mock.calls.length).toBe(1);
    expect(createJobMock.mock.calls[0][0].relativeUrls).toEqual([expectedUrl]);
  });
};

testSavedObjectRelativeUrl('search', '/app/kibana#/discover/abc?');
testSavedObjectRelativeUrl('visualization', '/app/kibana#/visualize/edit/abc?');
testSavedObjectRelativeUrl('dashboard', '/app/kibana#/dashboard/abc?');

test(`appends the queryString to the relativeUrl when generating from the savedObject`, async () => {
  const createJobMock = jest.fn();

  await compatibilityShim(createJobMock, mockLogger)(
    createMockJobParams({
      title: 'test',
      objectType: 'search',
      savedObjectId: 'abc',
      queryString: 'foo=bar',
    }),
    mockRequestHandlerContext
  );

  expect(mockLogger.warn.mock.calls.length).toBe(1);
  expect(mockLogger.warn.mock.calls[0][0]).toEqual(
    'The relativeUrls have been derived from saved object parameters. This functionality will be removed with the next major version.'
  );
  expect(mockLogger.error.mock.calls.length).toBe(0);

  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][0].relativeUrls).toEqual([
    '/app/kibana#/discover/abc?foo=bar',
  ]);
});

test(`throw an Error if the objectType, savedObjectId and relativeUrls are provided`, async () => {
  const createJobMock = jest.fn();

  const promise = compatibilityShim(createJobMock, mockLogger)(
    createMockJobParams({
      title: 'test',
      objectType: 'something',
      relativeUrls: ['/something'],
      savedObjectId: 'abc',
    }),
    mockRequestHandlerContext
  );

  await expect(promise).rejects.toBeDefined();
});

test(`passes headers and request through`, async () => {
  const createJobMock = jest.fn();

  await compatibilityShim(createJobMock, mockLogger)(
    createMockJobParams({ title: 'test', relativeUrls: ['/something'] }),
    mockRequestHandlerContext
  );

  expect(mockLogger.warn.mock.calls.length).toBe(0);
  expect(mockLogger.error.mock.calls.length).toBe(0);

  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][1]).toBe(mockRequestHandlerContext);
});
