/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, ReactWrapper, shallow } from 'enzyme';
import createHistory, { MemoryHistory } from 'history/createMemoryHistory';
import React from 'react';
import { Router } from 'react-router-dom';
import url from 'url';
// @ts-ignore
import { toJson } from '../testHelpers';
import {
  fromQuery,
  getKibanaHref,
  RelativeLinkComponent,
  toQuery,
  UnconnectedKibanaLink,
  ViewMLJob
} from '../url';

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
  let history: MemoryHistory;
  let wrapper: ReactWrapper;

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

describe('getKibanaHref', () => {
  it('should return the correct href', () => {
    const href = getKibanaHref({
      location: { search: '' },
      pathname: '/app/kibana',
      hash: '/discover',
      query: {
        _a: {
          interval: 'auto',
          query: {
            language: 'lucene',
            query: `context.service.name:"myServiceName" AND error.grouping_key:"myGroupId"`
          },
          sort: { '@timestamp': 'desc' }
        }
      }
    });

    const { _g, _a } = getUrlQuery(href);
    const { pathname } = url.parse(href);

    expect(pathname).toBe('/app/kibana');
    expect(_a).toBe(
      '(interval:auto,query:(language:lucene,query:\'context.service.name:"myServiceName" AND error.grouping_key:"myGroupId"\'),sort:(\'@timestamp\':desc))'
    );
    expect(_g).toBe('(time:(from:now-24h,mode:quick,to:now))');
  });
});

function getUnconnectedKibanLink() {
  const discoverQuery = {
    _a: {
      interval: 'auto',
      query: {
        language: 'lucene',
        query: `context.service.name:"myServiceName" AND error.grouping_key:"myGroupId"`
      },
      sort: { '@timestamp': 'desc' }
    }
  };

  return shallow(
    <UnconnectedKibanaLink
      location={{ search: '' }}
      pathname={'/app/kibana'}
      hash={'/discover'}
      query={discoverQuery}
    >
      Go to Discover
    </UnconnectedKibanaLink>
  );
}

describe('UnconnectedKibanaLink', () => {
  it('should have correct url', () => {
    const wrapper = getUnconnectedKibanLink();
    const href = wrapper.find('EuiLink').prop('href') || '';
    const { _g, _a } = getUrlQuery(href);
    const { pathname } = url.parse(href);

    expect(pathname).toBe('/app/kibana');
    expect(_a).toBe(
      '(interval:auto,query:(language:lucene,query:\'context.service.name:"myServiceName" AND error.grouping_key:"myGroupId"\'),sort:(\'@timestamp\':desc))'
    );
    expect(_g).toBe('(time:(from:now-24h,mode:quick,to:now))');
  });

  it('should render correct markup', () => {
    const wrapper = getUnconnectedKibanLink();
    expect(wrapper).toMatchSnapshot();
  });

  it('should include existing _g values in link href', () => {
    const wrapper = getUnconnectedKibanLink();
    wrapper.setProps({
      location: {
        search:
          '?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-7d,mode:relative,to:now-1d))'
      }
    });
    const href = wrapper.find('EuiLink').prop('href');
    const { _g } = getUrlQuery(href);

    expect(_g).toBe(
      '(refreshInterval:(pause:!t,value:0),time:(from:now-7d,mode:relative,to:now-1d))'
    );
  });

  it('should not throw due to hashed args', () => {
    const wrapper = getUnconnectedKibanLink();
    expect(() => {
      wrapper.setProps({ location: { search: '?_g=H@whatever' } });
    }).not.toThrow();
  });

  it('should use default time range when _g is empty', () => {
    const wrapper = getUnconnectedKibanLink();
    wrapper.setProps({ location: { search: '?_g=()' } });
    const href = wrapper.find('EuiLink').prop('href') as string;
    const { _g } = getUrlQuery(href);
    expect(_g).toBe('(time:(from:now-24h,mode:quick,to:now))');
  });

  it('should merge in _g query values', () => {
    const discoverQuery = {
      _g: {
        ml: {
          jobIds: [1337]
        }
      }
    };

    const wrapper = shallow(
      <UnconnectedKibanaLink
        location={{ search: '' }}
        pathname={'/app/kibana'}
        hash={'/discover'}
        query={discoverQuery}
      >
        Go to Discover
      </UnconnectedKibanaLink>
    );

    const href = wrapper.find('EuiLink').prop('href') as string;
    const { _g } = getUrlQuery(href);
    expect(_g).toBe(
      '(ml:(jobIds:!(1337)),time:(from:now-24h,mode:quick,to:now))'
    );
  });
});

function getUrlQuery(href?: string) {
  const hash = url.parse(href!).hash!.slice(1);
  return url.parse(hash, true).query;
}

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

    expect(wrapper).toMatchSnapshot();
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
      _g: {
        ml: {
          jobIds: ['myServiceName-myTransactionType-high_mean_response_time']
        }
      }
    });
  });
});
