/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Router } from 'react-router-dom';
import { mount } from 'enzyme';
import createHistory from 'history/createMemoryHistory';

import {
  toQuery,
  fromQuery,
  KibanaLinkComponent,
  RelativeLinkComponent
} from '../url';
import { toJson } from '../testHelpers';

describe('toQuery', () => {
  it('should parse string to object', () => {
    expect(toQuery('?foo=bar&name=john%20doe')).toEqual({
      foo: 'bar',
      name: 'john doe'
    });
  });
});

describe('fromQuery', () => {
  it('should parse object to string', () => {
    expect(
      fromQuery({
        foo: 'bar',
        name: 'john doe'
      })
    ).toEqual('foo=bar&name=john%20doe');
  });

  it('should not encode _a and _g', () => {
    expect(
      fromQuery({
        g: 'john doe:',
        _g: 'john doe:',
        a: 'john doe:',
        _a: 'john doe:'
      })
    ).toEqual('g=john%20doe%3A&_g=john%20doe:&a=john%20doe%3A&_a=john%20doe:');
  });
});

describe('RelativeLinkComponent', () => {
  let history;
  let wrapper;

  beforeEach(() => {
    history = createHistory();
    history.location = {
      ...history.location,
      pathname: '/opbeans-node/transactions',
      search: '?foo=bar'
    };

    wrapper = mount(
      <Router history={history}>
        <RelativeLinkComponent
          location={history.location}
          query={{ foo2: 'bar2' }}
          path={'/opbeans-node/errors'}
        >
          Go to Discover
        </RelativeLinkComponent>
      </Router>
    );
  });

  it('should have correct url', () => {
    expect(wrapper.find('a').prop('href')).toBe(
      '/opbeans-node/errors?foo=bar&foo2=bar2'
    );
  });

  it('should render correct markup', () => {
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  it('should have initial location', () => {
    expect(history.location).toEqual(
      expect.objectContaining({
        pathname: '/opbeans-node/transactions',
        search: '?foo=bar'
      })
    );
  });

  it('should update location on click', () => {
    wrapper.simulate('click', { button: 0 });
    expect(history.location).toEqual(
      expect.objectContaining({
        pathname: '/opbeans-node/errors',
        search: '?foo=bar&foo2=bar2'
      })
    );
  });
});

describe('KibanaLinkComponent', () => {
  let wrapper;

  beforeEach(() => {
    const discoverQuery = {
      _a: {
        interval: 'auto',
        query: {
          language: 'lucene',
          query: `context.service.name:myServiceName AND error.grouping_key:myGroupId`
        },
        sort: { '@timestamp': 'desc' }
      }
    };

    wrapper = mount(
      <KibanaLinkComponent
        location={{ search: '' }}
        pathname={'/app/kibana'}
        hash={'/discover'}
        query={discoverQuery}
      >
        Go to Discover
      </KibanaLinkComponent>
    );
  });

  it('should have correct url', () => {
    expect(wrapper.find('a').prop('href')).toBe(
      "/app/kibana#/discover?_g=&_a=(interval:auto,query:(language:lucene,query:'context.service.name:myServiceName AND error.grouping_key:myGroupId'),sort:('@timestamp':desc))"
    );
  });

  it('should render correct markup', () => {
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
