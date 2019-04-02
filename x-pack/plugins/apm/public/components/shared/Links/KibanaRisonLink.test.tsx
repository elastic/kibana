/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import { Location } from 'history';
import React from 'react';
import { UnconnectedKibanaRisonLink } from './KibanaRisonLink';

const getLinkWrapper = ({
  search = '',
  pathname = '/app/kibana',
  hash = '/discover',
  children = 'Some discover link text',
  query = {}
} = {}) =>
  shallow(
    <UnconnectedKibanaRisonLink
      location={{ search } as Location}
      pathname={pathname}
      hash={hash}
      children={children}
      query={query}
    />
  );

const DEFAULT_RISON_G = `(refreshInterval:(pause:true,value:'0'),time:(from:now-24h,to:now))`;

describe('UnconnectedKibanaLink', () => {
  it('should render correct markup', () => {
    expect(getLinkWrapper()).toMatchSnapshot();
  });

  it('should include default time picker values, rison-encoded', () => {
    const wrapper = getLinkWrapper();
    expect(wrapper.find('EuiLink').props().href).toEqual(
      expect.stringContaining(DEFAULT_RISON_G)
    );
  });

  it('should ignore new query params except for _g and _a', () => {
    const wrapper = getLinkWrapper({ query: { transactionId: 'test-id' } });
    expect(wrapper.find('EuiLink').props().href).not.toEqual(
      expect.stringContaining('transactionId')
    );
  });

  it('should rison-encode and merge in custom _g value', () => {
    const wrapper = getLinkWrapper({
      query: {
        _g: {
          something: {
            nested: 'custom g value'
          }
        }
      }
    });

    expect(wrapper.find('EuiLink').props().href).toEqual(
      expect.stringContaining(`something:(nested:'custom g value')`)
    );
  });

  it('should rison-encode custom _a value', () => {
    const wrapper = getLinkWrapper({
      query: {
        _a: {
          something: {
            nested: 'custom a value'
          }
        }
      }
    });
    expect(wrapper.find('EuiLink').props().href).toEqual(
      expect.stringContaining(`_a=(something:(nested:'custom a value'))`)
    );
  });

  it('should convert, url-encode, and rison-encode existing time picker values', () => {
    const wrapper = getLinkWrapper({
      search:
        '?rangeFrom=now/w&rangeTo=now&refreshPaused=false&refreshInterval=30000'
    });
    expect(wrapper.find('EuiLink').props().href).toEqual(
      "/app/kibana#/discover?_g=(refreshInterval:(pause:false,value:'30000'),time:(from:now%2Fw,to:now))"
    );
  });
});
