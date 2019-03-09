/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import { Location } from 'history';
import React from 'react';
import { UnconnectedKibanaLink } from './KibanaLink';

const getLinkWrapper = ({
  search = '',
  pathname = '/app/kibana',
  hash = '/something',
  children = 'Some link text',
  query = {}
} = {}) =>
  shallow(
    <UnconnectedKibanaLink
      location={{ search } as Location}
      pathname={pathname}
      hash={hash}
      children={children}
      query={query}
    />
  );

describe('UnconnectedKibanaLink', () => {
  it('should render correct markup', () => {
    expect(getLinkWrapper()).toMatchSnapshot();
  });

  it('should include valid query params', () => {
    const wrapper = getLinkWrapper({ query: { transactionId: 'test-id' } });
    expect(wrapper.find('EuiLink').props().href).toEqual(
      '/app/kibana#/something?transactionId=test-id'
    );
  });

  it('should include existing APM params for APM links', () => {
    const wrapper = getLinkWrapper({
      pathname: '/app/apm',
      search: '?rangeFrom=now-5w&rangeTo=now-2w'
    });
    expect(wrapper.find('EuiLink').props().href).toEqual(
      `/app/apm#/something?rangeFrom=now-5w&rangeTo=now-2w`
    );
  });

  it('should include APM params when the pathname is an empty string', () => {
    const wrapper = getLinkWrapper({
      pathname: '',
      search: '?rangeFrom=now-5w&rangeTo=now-2w'
    });
    expect(wrapper.find('EuiLink').props().href).toEqual(
      `#/something?rangeFrom=now-5w&rangeTo=now-2w`
    );
  });

  it('should NOT include APM params for non-APM links', () => {
    const wrapper = getLinkWrapper({
      pathname: '/app/something-else',
      search: '?rangeFrom=now-5w&rangeTo=now-2w'
    });
    expect(wrapper.find('EuiLink').props().href).toEqual(
      `/app/something-else#/something?`
    );
  });
});
