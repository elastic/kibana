/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./nav', () => ({
  useAppSearchNav: () => [],
}));

import React from 'react';

import { shallow } from 'enzyme';

import { SetAppSearchChrome } from '../../../shared/kibana_chrome';
import { EnterpriseSearchPageTemplateWrapper } from '../../../shared/layout';
import { SendAppSearchTelemetry } from '../../../shared/telemetry';

import { AppSearchPageTemplate } from './page_template';

describe('AppSearchPageTemplate', () => {
  it('renders', () => {
    const wrapper = shallow(
      <AppSearchPageTemplate>
        <div className="hello">world</div>
      </AppSearchPageTemplate>
    );

    expect(wrapper.type()).toEqual(EnterpriseSearchPageTemplateWrapper);
    expect(wrapper.prop('solutionNav')).toEqual({ name: 'App Search', items: [] });
    expect(wrapper.find('.hello').text()).toEqual('world');
  });

  describe('page chrome', () => {
    it('takes a breadcrumb array & renders a product-specific page chrome', () => {
      const wrapper = shallow(<AppSearchPageTemplate pageChrome={['Some page']} />);
      const setPageChrome = wrapper
        .find(EnterpriseSearchPageTemplateWrapper)
        .prop('setPageChrome') as any;

      expect(setPageChrome.type).toEqual(SetAppSearchChrome);
      expect(setPageChrome.props.trail).toEqual(['Some page']);
    });
  });

  describe('page telemetry', () => {
    it('takes a metric & renders product-specific telemetry viewed event', () => {
      const wrapper = shallow(<AppSearchPageTemplate pageViewTelemetry="some_page" />);

      expect(wrapper.find(SendAppSearchTelemetry).prop('action')).toEqual('viewed');
      expect(wrapper.find(SendAppSearchTelemetry).prop('metric')).toEqual('some_page');
    });
  });

  it('passes down any ...pageTemplateProps that EnterpriseSearchPageTemplateWrapper accepts', () => {
    const wrapper = shallow(
      <AppSearchPageTemplate
        pageHeader={{ pageTitle: 'hello world' }}
        isLoading={false}
        emptyState={<div />}
      />
    );

    expect(wrapper.find(EnterpriseSearchPageTemplateWrapper).prop('pageHeader')!.pageTitle).toEqual(
      'hello world'
    );
    expect(wrapper.find(EnterpriseSearchPageTemplateWrapper).prop('isLoading')).toEqual(false);
    expect(wrapper.find(EnterpriseSearchPageTemplateWrapper).prop('emptyState')).toEqual(<div />);
  });
});
