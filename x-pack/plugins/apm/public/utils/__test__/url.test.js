/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { mount } from 'enzyme';

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
  let wrapper;

  beforeEach(() => {
    wrapper = mount(
      <MemoryRouter>
        <RelativeLinkComponent
          location={{
            pathname: '/opbeans-backend/transactions',
            search:
              '?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-2y,mode:quick,to:now))'
          }}
          path={'/opbeans-backend/errors'}
          query={{}}
        >
          Errors
        </RelativeLinkComponent>
      </MemoryRouter>
    );
  });

  it('should have correct url', () => {
    expect(wrapper.find('a').prop('href')).toBe(
      '/opbeans-backend/errors?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-2y,mode:quick,to:now))'
    );
  });

  it('should render correct markup', () => {
    expect(toJson(wrapper)).toMatchSnapshot();
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
      "/kibanaBasePath/app/kibana#/discover?_g=&_a=(interval:auto,query:(language:lucene,query:'context.service.name:myServiceName AND error.grouping_key:myGroupId'),sort:('@timestamp':desc))"
    );
  });

  it('should render correct markup', () => {
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
