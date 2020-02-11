/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ResolverQuery } from './base';
import { EndpointAppConstants } from '../../../../common/types';

class TestResolverQuery extends ResolverQuery {
  protected legacyQuery(endpointID: string, uniquePID: string, index: string) {
    return { endpointID, uniquePID, index };
  }

  protected query(entityID: string, index: string) {
    return { entityID, index };
  }

  testPagination(field: string, query: any) {
    return this.paginateBy(field, query);
  }
}

describe('resolver query class', () => {
  it('parses a legacy entity ID correctly', () => {
    expect(new TestResolverQuery().build('endgame-5-awesome-id')).toStrictEqual({
      endpointID: 'awesome-id',
      uniquePID: '5',
      index: EndpointAppConstants.LEGACY_EVENT_INDEX_NAME,
    });
    expect(new TestResolverQuery().build('hello')).toStrictEqual({
      entityID: 'hello',
      index: EndpointAppConstants.EVENT_INDEX_NAME,
    });
  });

  it('adds the correct pagination parameters', () => {
    expect(new TestResolverQuery().testPagination('hi', {})).toStrictEqual({});
    expect(
      new TestResolverQuery().testPagination('hi', {
        foo: {
          bar: 'hello',
        },
      })
    ).toStrictEqual({
      foo: {
        bar: 'hello',
      },
    });
    const currentTime = new Date();
    expect(
      new TestResolverQuery({ size: 5, timestamp: currentTime, eventID: 'foo' }).testPagination(
        'hi',
        {}
      )
    ).toStrictEqual({
      search_after: [currentTime, 'foo'],
      size: 5,
      sort: [{ '@timestamp': 'asc' }, { hi: 'asc' }],
    });

    expect(
      new TestResolverQuery({ size: 5, timestamp: currentTime }).testPagination('hi', {})
    ).toStrictEqual({
      size: 5,
      sort: [{ '@timestamp': 'asc' }, { hi: 'asc' }],
    });

    expect(new TestResolverQuery({ size: 5 }).testPagination('hi', {})).toStrictEqual({
      size: 5,
      sort: [{ '@timestamp': 'asc' }, { hi: 'asc' }],
    });
  });
});
