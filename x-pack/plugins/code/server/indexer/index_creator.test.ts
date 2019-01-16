/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { AnyObject, EsClient } from '../lib/esqueue';
import { IndexCreationRequest } from './index_creation_request';
import { IndexCreator } from './index_creator';

const emptyAsyncFunc = async (_: AnyObject): Promise<any> => {
  Promise.resolve({});
};

const esClient = {
  indices: {
    existsAlias: emptyAsyncFunc,
    create: emptyAsyncFunc,
    putAlias: emptyAsyncFunc,
  },
};

afterEach(() => {
  sinon.restore();
});

test('Create Alias and Index', async () => {
  // Setup the esClient spies
  const existsAliasSpy = sinon.fake.returns(false);
  const createSpy = sinon.spy();
  const putAliasSpy = sinon.spy();
  esClient.indices.existsAlias = existsAliasSpy;
  esClient.indices.create = createSpy;
  esClient.indices.putAlias = putAliasSpy;

  const indexCreator = new IndexCreator((esClient as any) as EsClient);
  const req: IndexCreationRequest = {
    index: 'mockindex',
    settings: {},
    schema: {},
  };
  await indexCreator.createIndex(req);

  expect(existsAliasSpy.calledOnce).toBeTruthy();
  expect(createSpy.calledOnce).toBeTruthy();
  expect(putAliasSpy.calledOnce).toBeTruthy();
  expect(createSpy.calledAfter(existsAliasSpy)).toBeTruthy();
  expect(putAliasSpy.calledAfter(createSpy)).toBeTruthy();
});

test('Skip alias and index creation', async () => {
  // Setup the esClient spies
  const existsAliasSpy = sinon.fake.returns(true);
  const createSpy = sinon.spy();
  const putAliasSpy = sinon.spy();
  esClient.indices.existsAlias = existsAliasSpy;
  esClient.indices.create = createSpy;
  esClient.indices.putAlias = putAliasSpy;

  const indexCreator = new IndexCreator((esClient as any) as EsClient);
  const req: IndexCreationRequest = {
    index: 'mockindex',
    settings: {},
    schema: {},
  };
  await indexCreator.createIndex(req);

  expect(existsAliasSpy.calledOnce).toBeTruthy();
  expect(createSpy.notCalled).toBeTruthy();
  expect(putAliasSpy.notCalled).toBeTruthy();
});
