/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./nav', () => ({
  useWorkplaceSearchNav: () => [],
}));

import React from 'react';

import { shallow } from 'enzyme';

import { SetWorkplaceSearchChrome } from '../../../shared/kibana_chrome';
import { EnterpriseSearchPageTemplateWrapper } from '../../../shared/layout';
import { SendWorkplaceSearchTelemetry } from '../../../shared/telemetry';

import { WorkplaceSearchPageTemplate } from './page_template';

describe('WorkplaceSearchPageTemplate', () => {
  it('renders', () => {
    const wrapper = shallow(
      <WorkplaceSearchPageTemplate>
        <div className="hello">world</div>
      </WorkplaceSearchPageTemplate>
    );

    expect(wrapper.type()).toEqual(EnterpriseSearchPageTemplateWrapper);
    expect(wrapper.prop('solutionNav')).toEqual({ name: 'Workplace Search', items: [] });
    expect(wrapper.find('.hello').text()).toEqual('world');
  });

  describe('page chrome', () => {
    it('takes a breadcrumb array & renders a product-specific page chrome', () => {
      const wrapper = shallow(<WorkplaceSearchPageTemplate pageChrome={['Some page']} />);
      const setPageChrome = wrapper
        .find(EnterpriseSearchPageTemplateWrapper)
        .prop('setPageChrome') as any;

      expect(setPageChrome.type).toEqual(SetWorkplaceSearchChrome);
      expect(setPageChrome.props.trail).toEqual(['Some page']);
    });
  });

  describe('page telemetry', () => {
    it('takes a metric & renders product-specific telemetry viewed event', () => {
      const wrapper = shallow(<WorkplaceSearchPageTemplate pageViewTelemetry="some_page" />);

      expect(wrapper.find(SendWorkplaceSearchTelemetry).prop('action')).toEqual('viewed');
      expect(wrapper.find(SendWorkplaceSearchTelemetry).prop('metric')).toEqual('some_page');
    });
  });

  describe('props', () => {
    it('allows overriding the restrictWidth default', () => {
      const wrapper = shallow(<WorkplaceSearchPageTemplate />);
      expect(wrapper.find(EnterpriseSearchPageTemplateWrapper).prop('restrictWidth')).toEqual(true);

      wrapper.setProps({ restrictWidth: false });
      expect(wrapper.find(EnterpriseSearchPageTemplateWrapper).prop('restrictWidth')).toEqual(
        false
      );
    });

    it('passes down any ...pageTemplateProps that EnterpriseSearchPageTemplateWrapper accepts', () => {
      const wrapper = shallow(
        <WorkplaceSearchPageTemplate
          pageHeader={{ pageTitle: 'hello world' }}
          isLoading={false}
          emptyState={<div />}
        />
      );

      expect(
        wrapper.find(EnterpriseSearchPageTemplateWrapper).prop('pageHeader')!.pageTitle
      ).toEqual('hello world');
      expect(wrapper.find(EnterpriseSearchPageTemplateWrapper).prop('isLoading')).toEqual(false);
      expect(wrapper.find(EnterpriseSearchPageTemplateWrapper).prop('emptyState')).toEqual(<div />);
    });
  });
});
