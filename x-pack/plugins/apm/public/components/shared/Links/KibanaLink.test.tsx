/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import { Location } from 'history';
import React from 'react';
import url from 'url';
import { UnconnectedKibanaLink } from './KibanaLink';

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
      location={{ search: '' } as Location}
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
        location={{ search: '' } as Location}
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
