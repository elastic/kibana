/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import sinon from 'sinon';
import { KibanaResponseFactory } from 'src/core/server';
import { sendResponse } from './mvt_routes';

const mockStream = Readable.from(['{}']);

test('should send error response when status code is above 400', () => {
  const responseMock = {
    customError: sinon.spy(),
    ok: sinon.spy(),
  };
  sendResponse(responseMock as unknown as KibanaResponseFactory, mockStream, {}, 400);
  expect(responseMock.ok.notCalled);
  expect(responseMock.customError.calledOnce);
  const firstCallArgs = responseMock.customError.getCall(0).args[0];
  expect(firstCallArgs.statusCode).toBe(400);
});

test('should forward content-length and content-encoding elasticsearch headers', () => {
  const responseMock = {
    customError: sinon.spy(),
    ok: sinon.spy(),
  };
  sendResponse(
    responseMock as unknown as KibanaResponseFactory,
    mockStream,
    { 'content-encoding': 'gzip', 'content-length': '19326' },
    200
  );
  expect(responseMock.ok.calledOnce);
  expect(responseMock.customError.notCalled);
  const firstCallArgs = responseMock.ok.getCall(0).args[0];
  const headers = { ...firstCallArgs.headers };

  // remove lastModified from comparision check since its a timestamp that changes every run
  expect(headers).toHaveProperty('Last-Modified');
  delete headers['Last-Modified'];
  expect(headers).toEqual({
    'Cache-Control': 'public, max-age=3600',
    'Content-Type': 'application/x-protobuf',
    'content-disposition': 'inline',
    'content-encoding': 'gzip',
    'content-length': '19326',
  });
});

test('should not set content-encoding when elasticsearch does not provide value', () => {
  const responseMock = {
    customError: sinon.spy(),
    ok: sinon.spy(),
  };
  sendResponse(
    responseMock as unknown as KibanaResponseFactory,
    mockStream,
    { 'content-length': '19326' },
    200
  );
  expect(responseMock.ok.calledOnce);
  expect(responseMock.customError.notCalled);
  const firstCallArgs = responseMock.ok.getCall(0).args[0];
  const headers = { ...firstCallArgs.headers };

  // remove lastModified from comparision check since its a timestamp that changes every run
  expect(headers).toHaveProperty('Last-Modified');
  delete headers['Last-Modified'];
  expect(headers).toEqual({
    'Cache-Control': 'public, max-age=3600',
    'Content-Type': 'application/x-protobuf',
    'content-disposition': 'inline',
    'content-length': '19326',
  });
});
