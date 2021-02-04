/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { EuiButtonEmpty } from '@elastic/eui';

import { ConfigDocsLinks } from './config_docs_links';

describe('ConfigDocsLinks', () => {
  const props = {
    name: 'foo',
    documentationUrl: 'http://docs.elastic',
  };

  it('renders', () => {
    const wrapper = shallow(<ConfigDocsLinks {...props} />);

    expect(wrapper.find(EuiButtonEmpty)).toHaveLength(1);
  });

  it('renders with applicationPortalUrl', () => {
    const wrapper = shallow(
      <ConfigDocsLinks {...props} applicationPortalUrl="http://portal.app" />
    );

    expect(wrapper.find(EuiButtonEmpty)).toHaveLength(2);
    expect(wrapper.find(EuiButtonEmpty).last().prop('children')).toEqual('foo Application Portal');
  });

  it('renders with applicationLinkTitle', () => {
    const wrapper = shallow(
      <ConfigDocsLinks
        {...props}
        applicationLinkTitle="My App"
        applicationPortalUrl="http://portal.app"
      />
    );

    expect(wrapper.find(EuiButtonEmpty).last().prop('children')).toEqual('My App');
  });
});
