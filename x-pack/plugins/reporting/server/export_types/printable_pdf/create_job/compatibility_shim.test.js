/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compatibilityShimFactory } from './compatibility_shim';

const createMockLogger = () => ({
  warn: jest.fn(),
  error: jest.fn(),
});

const createMockContext = () => {
  return {
    core: {
      savedObjects: {
        client: {
          get: jest.fn(),
        },
      },
    },
  };
};

test(`passes title through if provided`, async () => {
  const mockLogger = createMockLogger();
  const compatibilityShim = compatibilityShimFactory(mockLogger);
  const title = 'test title';

  const createJobMock = jest.fn();
  await compatibilityShim(createJobMock)(
    { title, relativeUrls: ['/something'] },
    createMockContext(),
    null
  );

  expect(mockLogger.warn.mock.calls.length).toBe(0);
  expect(mockLogger.error.mock.calls.length).toBe(0);

  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][0].title).toBe(title);
});

test(`gets the title from the savedObject`, async () => {
  const mockLogger = createMockLogger();
  const compatibilityShim = compatibilityShimFactory(mockLogger);

  const createJobMock = jest.fn();
  const context = createMockContext();
  const title = 'savedTitle';
  context.core.savedObjects.client.get.mockReturnValue({
    attributes: {
      title,
    },
  });

  await compatibilityShim(createJobMock)(
    { objectType: 'search', savedObjectId: 'abc' },
    context,
    null
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
  const mockLogger = createMockLogger();
  const compatibilityShim = compatibilityShimFactory(mockLogger);

  const createJobMock = jest.fn();
  const context = createMockContext();
  context.core.savedObjects.client.get.mockReturnValue({
    attributes: {
      title: '',
    },
  });

  const objectType = 'search';
  const savedObjectId = 'abc';
  await compatibilityShim(createJobMock)({ objectType, savedObjectId }, context, null);

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
  const mockLogger = createMockLogger();
  const compatibilityShim = compatibilityShimFactory(mockLogger);

  const createJobMock = jest.fn();
  const context = createMockContext();

  await compatibilityShim(createJobMock)(
    { title: 'Phenomenal Dashboard', relativeUrls: ['/abc', '/def'] },
    context,
    null
  );

  expect(mockLogger.warn.mock.calls.length).toBe(0);
  expect(mockLogger.error.mock.calls.length).toBe(0);
});

test(`logs warning if title can not be provided`, async () => {
  const mockLogger = createMockLogger();
  const compatibilityShim = compatibilityShimFactory(mockLogger);

  const createJobMock = jest.fn();
  const context = createMockContext();
  await compatibilityShim(createJobMock)({ relativeUrls: ['/abc'] }, context, null);

  expect(mockLogger.warn.mock.calls.length).toBe(1);
  expect(mockLogger.warn.mock.calls[0][0]).toEqual(
    `A title parameter should be provided with the job generation request. Please ` +
      `use Kibana to regenerate your POST URL to have a title included in the PDF.`
  );
});

test(`logs deprecations when generating the title/relativeUrl using the savedObject`, async () => {
  const mockLogger = createMockLogger();
  const compatibilityShim = compatibilityShimFactory(mockLogger);

  const createJobMock = jest.fn();
  const context = createMockContext();
  context.core.savedObjects.client.get.mockReturnValue({
    attributes: {
      title: '',
    },
  });

  await compatibilityShim(createJobMock)(
    { objectType: 'search', savedObjectId: 'abc' },
    context,
    null
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
  const mockLogger = createMockLogger();
  const compatibilityShim = compatibilityShimFactory(mockLogger);

  const createJobMock = jest.fn();
  const context = createMockContext();

  const objectType = 'foo';
  await compatibilityShim(createJobMock)(
    { title: 'test', relativeUrls: ['/something'], objectType },
    context,
    null
  );

  expect(mockLogger.warn.mock.calls.length).toBe(0);
  expect(mockLogger.error.mock.calls.length).toBe(0);

  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][0].objectType).toBe(objectType);
});

test(`passes the relativeUrls through`, async () => {
  const mockLogger = createMockLogger();
  const compatibilityShim = compatibilityShimFactory(mockLogger);

  const createJobMock = jest.fn();

  const relativeUrls = ['/app/kibana#something', '/app/kibana#something-else'];
  await compatibilityShim(createJobMock)({ title: 'test', relativeUrls }, null, null);

  expect(mockLogger.warn.mock.calls.length).toBe(0);
  expect(mockLogger.error.mock.calls.length).toBe(0);

  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][0].relativeUrls).toBe(relativeUrls);
});

const testSavedObjectRelativeUrl = (objectType, expectedUrl) => {
  test(`generates the saved object relativeUrl for ${objectType}`, async () => {
    const mockLogger = createMockLogger();
    const compatibilityShim = compatibilityShimFactory(mockLogger);
    const createJobMock = jest.fn();

    await compatibilityShim(createJobMock)(
      { title: 'test', objectType, savedObjectId: 'abc' },
      null,
      null
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
  const mockLogger = createMockLogger();
  const compatibilityShim = compatibilityShimFactory(mockLogger);
  const createJobMock = jest.fn();

  await compatibilityShim(createJobMock)(
    { title: 'test', objectType: 'search', savedObjectId: 'abc', queryString: 'foo=bar' },
    null,
    null
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
  const mockLogger = createMockLogger();
  const compatibilityShim = compatibilityShimFactory(mockLogger);
  const createJobMock = jest.fn();

  const promise = compatibilityShim(createJobMock)(
    {
      title: 'test',
      objectType: 'something',
      relativeUrls: ['/something'],
      savedObjectId: 'abc',
    },
    null,
    null
  );

  await expect(promise).rejects.toBeDefined();
});

test(`passes headers and request through`, async () => {
  const mockLogger = createMockLogger();
  const compatibilityShim = compatibilityShimFactory(mockLogger);

  const createJobMock = jest.fn();

  const req = {};
  const context = createMockContext();

  await compatibilityShim(createJobMock)(
    { title: 'test', relativeUrls: ['/something'] },
    context,
    req
  );

  expect(mockLogger.warn.mock.calls.length).toBe(0);
  expect(mockLogger.error.mock.calls.length).toBe(0);

  expect(createJobMock.mock.calls.length).toBe(1);
  expect(createJobMock.mock.calls[0][1]).toBe(context);
  expect(createJobMock.mock.calls[0][2]).toBe(req);
});
