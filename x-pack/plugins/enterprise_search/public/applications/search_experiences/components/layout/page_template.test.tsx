/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../shared/layout/nav', () => ({
  useEnterpriseSearchNav: () => [],
}));

import React from 'react';

import { shallow } from 'enzyme';

import { SetSearchExperiencesChrome } from '../../../shared/kibana_chrome';
import { EnterpriseSearchPageTemplateWrapper } from '../../../shared/layout';
import { SendEnterpriseSearchTelemetry } from '../../../shared/telemetry';

import { EnterpriseSearchSearchExperiencesPageTemplate } from './page_template';

describe('EnterpriseSearchSearchExperiencesPageTemplate', () => {
  it('renders', () => {
    const wrapper = shallow(
      <EnterpriseSearchSearchExperiencesPageTemplate>
        <div className="hello">world</div>
      </EnterpriseSearchSearchExperiencesPageTemplate>
    );

    expect(wrapper.type()).toEqual(EnterpriseSearchPageTemplateWrapper);
    expect(wrapper.prop('solutionNav')).toEqual({ name: 'Enterprise Search', items: [] });
    expect(wrapper.find('.hello').text()).toEqual('world');
  });

  describe('page chrome', () => {
    it('takes a breadcrumb array & renders a product-specific page chrome', () => {
      const wrapper = shallow(
        <EnterpriseSearchSearchExperiencesPageTemplate pageChrome={['Some page']} />
      );
      const setPageChrome = wrapper
        .find(EnterpriseSearchPageTemplateWrapper)
        .prop('setPageChrome') as any;

      expect(setPageChrome.type).toEqual(SetSearchExperiencesChrome);
      expect(setPageChrome.props.trail).toEqual(['Some page']);
    });
  });

  describe('page telemetry', () => {
    it('takes a metric & renders product-specific telemetry viewed event', () => {
      const wrapper = shallow(
        <EnterpriseSearchSearchExperiencesPageTemplate pageViewTelemetry="some_page" />
      );

      expect(wrapper.find(SendEnterpriseSearchTelemetry).prop('action')).toEqual('viewed');
      expect(wrapper.find(SendEnterpriseSearchTelemetry).prop('metric')).toEqual('some_page');
    });
  });

  describe('props', () => {
    it('passes down any ...pageTemplateProps that EnterpriseSearchPageTemplateWrapper accepts', () => {
      const wrapper = shallow(
        <EnterpriseSearchSearchExperiencesPageTemplate
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
