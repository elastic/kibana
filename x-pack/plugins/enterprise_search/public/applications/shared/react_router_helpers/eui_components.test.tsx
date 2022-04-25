/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('.', () => ({
  generateReactRouterProps: ({ to }: { to: string }) => ({
    href: `/app/enterprise_search${to}`,
    onClick: () => {},
  }),
}));

import React from 'react';

import { shallow } from 'enzyme';

import {
  EuiLink,
  EuiButton,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiListGroupItem,
  EuiPanel,
  EuiCard,
} from '@elastic/eui';

import {
  EuiLinkTo,
  EuiButtonTo,
  EuiButtonEmptyTo,
  EuiButtonIconTo,
  EuiListGroupItemTo,
  EuiPanelTo,
  EuiCardTo,
} from './eui_components';

describe('React Router EUI component helpers', () => {
  it('renders an EuiLink', () => {
    const wrapper = shallow(<EuiLinkTo to="/" />);

    expect(wrapper.find(EuiLink)).toHaveLength(1);
  });

  it('renders an EuiButton', () => {
    const wrapper = shallow(<EuiButtonTo to="/" />);

    expect(wrapper.find(EuiButton)).toHaveLength(1);
  });

  it('renders an EuiButtonEmpty', () => {
    const wrapper = shallow(<EuiButtonEmptyTo to="/" />);

    expect(wrapper.find(EuiButtonEmpty)).toHaveLength(1);
  });

  it('renders an EuiButtonIconTo', () => {
    const wrapper = shallow(<EuiButtonIconTo iconType="pencil" to="/" />);

    expect(wrapper.find(EuiButtonIcon)).toHaveLength(1);
  });

  it('renders an EuiListGroupItem', () => {
    const wrapper = shallow(<EuiListGroupItemTo to="/" label="foo" />);

    expect(wrapper.find(EuiListGroupItem)).toHaveLength(1);
    expect(wrapper.find(EuiListGroupItem).prop('label')).toEqual('foo');
  });

  it('renders an EuiPanel', () => {
    const wrapper = shallow(<EuiPanelTo to="/" paddingSize="l" />);

    expect(wrapper.find(EuiPanel)).toHaveLength(1);
    expect(wrapper.find(EuiPanel).prop('paddingSize')).toEqual('l');
  });

  it('renders an EuiCard', () => {
    const wrapper = shallow(<EuiCardTo to="/" title="test" description="" />);

    expect(wrapper.find(EuiCard)).toHaveLength(1);
    expect(wrapper.find(EuiCard).prop('title')).toEqual('test');
  });

  it('passes down all ...rest props', () => {
    const wrapper = shallow(<EuiLinkTo to="/" data-test-subj="test" external />);
    const link = wrapper.find(EuiLink);

    expect(link.prop('external')).toEqual(true);
    expect(link.prop('data-test-subj')).toEqual('test');
  });

  it('renders with generated href and onClick props', () => {
    const wrapper = shallow(<EuiLinkTo to="/hello/world" />);
    const link = wrapper.find(EuiLink);

    expect(link.prop('onClick')).toBeInstanceOf(Function);
    expect(link.prop('href')).toEqual('/app/enterprise_search/hello/world');
  });
});
