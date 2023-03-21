/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { makeHierarchicalExecutionContext } from './hierarchical_execution_context';

describe('makeHierarchicalExecutionContext', () => {
  let injectedContext = {};
  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../../kibana_services').getExecutionContext = () => ({
      get: () => injectedContext,
    });
  });

  test('creates basic context when no top level context is provided', () => {
    const context = makeHierarchicalExecutionContext('test');
    expect(context).toStrictEqual({
      description: 'test',
      name: 'maps',
      type: 'application',
      url: '/',
    });
  });

  test('merges with top level context if its from the same app', () => {
    injectedContext = {
      name: 'maps',
      id: '1234',
    };
    const context = makeHierarchicalExecutionContext('test');
    expect(context).toStrictEqual({
      description: 'test',
      name: 'maps',
      type: 'application',
      url: '/',
      id: '1234',
    });
  });

  test('nests inside top level context if its from a different app', () => {
    injectedContext = {
      name: 'other-app',
      id: 'otherApp1234',
    };
    const context = makeHierarchicalExecutionContext('test', 'map1234');
    expect(context).toStrictEqual({
      name: 'other-app',
      id: 'otherApp1234',
      child: {
        description: 'test',
        id: 'map1234',
        type: 'application',
        name: 'maps',
        url: '/',
      },
    });
  });
});
