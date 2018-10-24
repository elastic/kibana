/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Router } from 'react-router-dom';
import { mount, shallow } from 'enzyme';
import createHistory from 'history/createMemoryHistory';
import {
  toQuery,
  fromQuery,
  KibanaLinkComponent,
  RelativeLinkComponent,
  encodeKibanaSearchParams,
  decodeKibanaSearchParams,
  ViewMLJob
} from '../url';
import { toJson } from '../testHelpers';

jest.mock('ui/chrome', () => ({
  addBasePath: path => `myBasePath${path}`
}));

describe('encodeKibanaSearchParams and decodeKibanaSearchParams should return the original string', () => {
  it('should convert string to object', () => {
    const search = `?_g=(ml:(jobIds:!(opbeans-node-request-high_mean_response_time)),refreshInterval:(display:Off,pause:!f,value:0),time:(from:'2018-06-06T08:20:45.437Z',mode:absolute,to:'2018-06-14T21:56:58.505Z'))&_a=(filters:!(),mlSelectInterval:(interval:(display:Auto,val:auto)),mlSelectSeverity:(threshold:(display:warning,val:0)),mlTimeSeriesExplorer:(),query:(query_string:(analyze_wildcard:!t,query:'*')))`;
    const nextSearch = encodeKibanaSearchParams(
      decodeKibanaSearchParams(search)
    );
    expect(search).toBe(`?${nextSearch}`);
  });
});

describe('decodeKibanaSearchParams', () => {
  it('when both _a and _g are defined', () => {
    const search = `?_g=(ml:(jobIds:!(opbeans-node-request-high_mean_response_time)),refreshInterval:(display:Off,pause:!f,value:0),time:(from:'2018-06-06T08:20:45.437Z',mode:absolute,to:'2018-06-14T21:56:58.505Z'))&_a=(filters:!(),mlSelectInterval:(interval:(display:Auto,val:auto)),mlSelectSeverity:(threshold:(display:warning,val:0)),mlTimeSeriesExplorer:(),query:(query_string:(analyze_wildcard:!t,query:'*')))`;
    const query = decodeKibanaSearchParams(search);
    expect(query).toEqual({
      _a: {
        filters: [],
        mlSelectInterval: { interval: { display: 'Auto', val: 'auto' } },
        mlSelectSeverity: { threshold: { display: 'warning', val: 0 } },
        mlTimeSeriesExplorer: {},
        query: { query_string: { analyze_wildcard: true, query: '*' } }
      },
      _g: {
        ml: { jobIds: ['opbeans-node-request-high_mean_response_time'] },
        refreshInterval: { display: 'Off', pause: false, value: 0 },
        time: {
          from: '2018-06-06T08:20:45.437Z',
          mode: 'absolute',
          to: '2018-06-14T21:56:58.505Z'
        }
      }
    });
  });

  it('when only _g is defined', () => {
    const search = `?_g=(ml:(jobIds:!(opbeans-node-request-high_mean_response_time)))`;
    const query = decodeKibanaSearchParams(search);
    expect(query).toEqual({
      _a: null,
      _g: {
        ml: { jobIds: ['opbeans-node-request-high_mean_response_time'] }
      }
    });
  });
});

describe('encodeKibanaSearchParams', () => {
  it('should convert object to string', () => {
    const query = {
      _a: {
        filters: [],
        mlSelectInterval: { interval: { display: 'Auto', val: 'auto' } },
        mlSelectSeverity: { threshold: { display: 'warning', val: 0 } },
        mlTimeSeriesExplorer: {},
        query: { query_string: { analyze_wildcard: true, query: '*' } }
      },
      _g: {
        ml: { jobIds: ['opbeans-node-request-high_mean_response_time'] },
        refreshInterval: { display: 'Off', pause: false, value: 0 },
        time: {
          from: '2018-06-06T08:20:45.437Z',
          mode: 'absolute',
          to: '2018-06-14T21:56:58.505Z'
        }
      }
    };
    const search = encodeKibanaSearchParams(query);
    expect(search).toBe(
      `_g=(ml:(jobIds:!(opbeans-node-request-high_mean_response_time)),refreshInterval:(display:Off,pause:!f,value:0),time:(from:'2018-06-06T08:20:45.437Z',mode:absolute,to:'2018-06-14T21:56:58.505Z'))&_a=(filters:!(),mlSelectInterval:(interval:(display:Auto,val:auto)),mlSelectSeverity:(threshold:(display:warning,val:0)),mlTimeSeriesExplorer:(),query:(query_string:(analyze_wildcard:!t,query:'*')))`
    );
  });
});

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
      "myBasePath/app/kibana#/discover?_a=(interval:auto,query:(language:lucene,query:'context.service.name:myServiceName AND error.grouping_key:myGroupId'),sort:('@timestamp':desc))&_g="
    );
  });

  it('should render correct markup', () => {
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});

describe('ViewMLJob', () => {
  it('should render component', () => {
    const location = { search: '' };
    const wrapper = shallow(
      <ViewMLJob
        serviceName="myServiceName"
        transactionType="myTransactionType"
        location={location}
      />
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });

  it('should have correct path props', () => {
    const location = { search: '' };
    const wrapper = shallow(
      <ViewMLJob
        serviceName="myServiceName"
        transactionType="myTransactionType"
        location={location}
      />
    );

    expect(wrapper.prop('pathname')).toBe('/app/ml');
    expect(wrapper.prop('hash')).toBe('/timeseriesexplorer');
    expect(wrapper.prop('query')).toEqual({
      _a: null,
      _g: {
        ml: {
          jobIds: ['myServiceName-myTransactionType-high_mean_response_time']
        }
      }
    });
  });
});
