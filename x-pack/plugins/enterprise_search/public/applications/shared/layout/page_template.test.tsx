/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut } from '@elastic/eui';

import { KibanaPageTemplate } from '../../../../../../../src/plugins/kibana_react/public';
import { FlashMessages } from '../flash_messages';
import { Loading } from '../loading';

import { EnterpriseSearchPageTemplateWrapper } from './page_template';

describe('EnterpriseSearchPageTemplateWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({ readOnlyMode: false });
  });

  it('renders', () => {
    const wrapper = shallow(<EnterpriseSearchPageTemplateWrapper />);

    expect(wrapper.type()).toEqual(KibanaPageTemplate);
  });

  it('renders children', () => {
    const wrapper = shallow(
      <EnterpriseSearchPageTemplateWrapper>
        <div className="hello">world</div>
      </EnterpriseSearchPageTemplateWrapper>
    );

    expect(wrapper.find('.hello').text()).toEqual('world');
  });

  describe('loading state', () => {
    it('renders a loading icon in place of children', () => {
      const wrapper = shallow(
        <EnterpriseSearchPageTemplateWrapper isLoading>
          <div className="test" />
        </EnterpriseSearchPageTemplateWrapper>
      );

      expect(wrapper.find(Loading).exists()).toBe(true);
      expect(wrapper.find('.test').exists()).toBe(false);
    });

    it('renders children & does not render a loading icon when the page is done loading', () => {
      const wrapper = shallow(
        <EnterpriseSearchPageTemplateWrapper isLoading={false}>
          <div className="test" />
        </EnterpriseSearchPageTemplateWrapper>
      );

      expect(wrapper.find(Loading).exists()).toBe(false);
      expect(wrapper.find('.test').exists()).toBe(true);
    });
  });

  describe('empty state', () => {
    it('renders a custom empty state in place of children', () => {
      const wrapper = shallow(
        <EnterpriseSearchPageTemplateWrapper
          isEmptyState
          emptyState={<div className="emptyState">Nothing here yet!</div>}
        >
          <div className="test" />
        </EnterpriseSearchPageTemplateWrapper>
      );

      expect(wrapper.find('.emptyState').exists()).toBe(true);
      expect(wrapper.find('.test').exists()).toBe(false);

      // @see https://github.com/elastic/kibana/blob/main/dev_docs/tutorials/kibana_page_template.mdx#isemptystate
      // if you want to use KibanaPageTemplate's `isEmptyState` without a custom emptyState
    });

    it('does not render the custom empty state if the page is not empty', () => {
      const wrapper = shallow(
        <EnterpriseSearchPageTemplateWrapper
          isEmptyState={false}
          emptyState={<div className="emptyState">Nothing here yet!</div>}
        >
          <div className="test" />
        </EnterpriseSearchPageTemplateWrapper>
      );

      expect(wrapper.find('.emptyState').exists()).toBe(false);
      expect(wrapper.find('.test').exists()).toBe(true);
    });

    it('does not render an empty state if the page is still loading', () => {
      const wrapper = shallow(
        <EnterpriseSearchPageTemplateWrapper
          isLoading
          isEmptyState
          emptyState={<div className="emptyState" />}
        />
      );

      expect(wrapper.find(Loading).exists()).toBe(true);
      expect(wrapper.find('.emptyState').exists()).toBe(false);
    });
  });

  describe('read-only mode', () => {
    it('renders a callout if in read-only mode', () => {
      setMockValues({ readOnlyMode: true });
      const wrapper = shallow(<EnterpriseSearchPageTemplateWrapper />);

      expect(wrapper.find(EuiCallOut).exists()).toBe(true);
    });

    it('does not render a callout if not in read-only mode', () => {
      setMockValues({ readOnlyMode: false });
      const wrapper = shallow(<EnterpriseSearchPageTemplateWrapper />);

      expect(wrapper.find(EuiCallOut).exists()).toBe(false);
    });
  });

  describe('flash messages', () => {
    it('renders FlashMessages by default', () => {
      const wrapper = shallow(<EnterpriseSearchPageTemplateWrapper />);

      expect(wrapper.find(FlashMessages).exists()).toBe(true);
    });

    it('does not render FlashMessages if hidden', () => {
      // Example use case: manually showing flash messages in an open flyout or modal
      // and not wanting to duplicate flash messages on the overlayed page
      const wrapper = shallow(<EnterpriseSearchPageTemplateWrapper hideFlashMessages />);

      expect(wrapper.find(FlashMessages).exists()).toBe(false);
    });
  });

  describe('page chrome', () => {
    const SetPageChrome = () => <div />;

    it('renders a product-specific <SetPageChrome />', () => {
      const wrapper = shallow(
        <EnterpriseSearchPageTemplateWrapper setPageChrome={<SetPageChrome />} />
      );

      expect(wrapper.find(SetPageChrome).exists()).toBe(true);
    });

    it('invokes page chrome immediately (without waiting for isLoading to be finished)', () => {
      const wrapper = shallow(
        <EnterpriseSearchPageTemplateWrapper setPageChrome={<SetPageChrome />} isLoading />
      );

      expect(wrapper.find(SetPageChrome).exists()).toBe(true);

      // This behavior is in contrast to page view telemetry, which is invoked after isLoading finishes
      // In addition to the pageHeader prop also changing immediately, this makes navigation feel much snappier
    });
  });

  describe('EuiPageTemplate props', () => {
    it('overrides the restrictWidth prop', () => {
      const wrapper = shallow(<EnterpriseSearchPageTemplateWrapper restrictWidth />);

      expect(wrapper.find(KibanaPageTemplate).prop('restrictWidth')).toEqual(true);
    });

    it('passes down any ...pageTemplateProps that EuiPageTemplate accepts', () => {
      const wrapper = shallow(
        <EnterpriseSearchPageTemplateWrapper
          template="empty"
          paddingSize="s"
          pageHeader={{ pageTitle: 'hello world' }}
        />
      );

      expect(wrapper.find(KibanaPageTemplate).prop('template')).toEqual('empty');
      expect(wrapper.find(KibanaPageTemplate).prop('paddingSize')).toEqual('s');
      expect(wrapper.find(KibanaPageTemplate).prop('pageHeader')!.pageTitle).toEqual('hello world');
    });

    it('sets enterpriseSearchPageTemplate classNames while still accepting custom classNames', () => {
      const wrapper = shallow(
        <EnterpriseSearchPageTemplateWrapper
          className="hello"
          pageContentProps={{ className: 'world' }}
        />
      );

      expect(wrapper.find(KibanaPageTemplate).prop('className')).toEqual(
        'enterpriseSearchPageTemplate hello'
      );
      expect(wrapper.find(KibanaPageTemplate).prop('pageContentProps')!.className).toEqual(
        'enterpriseSearchPageTemplate__content world'
      );
    });

    it('automatically sets the Enterprise Search logo onto passed solution navs', () => {
      const wrapper = shallow(
        <EnterpriseSearchPageTemplateWrapper
          solutionNav={{ name: 'Enterprise Search', items: [] }}
        />
      );

      expect(wrapper.find(KibanaPageTemplate).prop('solutionNav')).toEqual({
        icon: 'logoEnterpriseSearch',
        name: 'Enterprise Search',
        items: [],
      });
    });
  });
});
