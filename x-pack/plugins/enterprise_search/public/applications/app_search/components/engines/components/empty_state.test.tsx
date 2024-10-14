/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, mockTelemetryActions } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { mount, shallow, ShallowWrapper } from 'enzyme';

import { EuiEmptyPrompt } from '@elastic/eui';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { SampleEngineCreationCta } from '../../sample_engine_creation_cta';

import { EmptyState } from '.';

describe('EmptyState', () => {
  describe('when the user can manage/create engines', () => {
    let wrapper: ShallowWrapper;
    let prompt: ShallowWrapper;

    beforeAll(() => {
      setMockValues({ myRole: { canManageEngines: true } });
      wrapper = shallow(<EmptyState />);
      prompt = wrapper.find(EuiEmptyPrompt).dive();
    });

    afterAll(() => {
      jest.clearAllMocks();
    });

    it('renders a prompt to create an engine', () => {
      expect(wrapper.find('[data-test-subj="AdminEmptyEnginesPrompt"]')).toHaveLength(1);
    });

    it('contains a sample engine CTA', () => {
      expect(prompt.find(SampleEngineCreationCta)).toHaveLength(1);
    });

    describe('create engine button', () => {
      let button: ShallowWrapper;

      beforeAll(() => {
        button = prompt.find('[data-test-subj="EmptyStateCreateFirstEngineCta"]');
      });

      it('sends telemetry on create first engine click', () => {
        button.simulate('click');
        expect(mockTelemetryActions.sendAppSearchTelemetry).toHaveBeenCalled();
      });

      it('sends a user to engine creation', () => {
        expect(button.prop('to')).toEqual('/engines/new');
      });
    });
  });

  describe('when the user cannot manage/create engines', () => {
    let wrapper: ShallowWrapper;

    beforeAll(() => {
      setMockValues({ myRole: { canManageEngines: false } });
      wrapper = shallow(<EmptyState />);
    });

    afterAll(() => {
      jest.clearAllMocks();
    });

    it('renders a prompt to contact the App Search admin', () => {
      expect(wrapper.find('[data-test-subj="NonAdminEmptyEnginesPrompt"]')).toHaveLength(1);
    });
  });

  describe('deprecation callout', () => {
    it('renders the deprecation callout when user can manage engines', () => {
      setMockValues({ myRole: { canManageEngines: true } });
      const wrapper = shallow(<EmptyState />);
      expect(wrapper.find('EnterpriseSearchDeprecationCallout')).toHaveLength(1);
    });

    it('renders the deprecation callout when user cannot manage engines', () => {
      setMockValues({ myRole: { canManageEngines: false } });
      const wrapper = shallow(<EmptyState />);
      expect(wrapper.find('EnterpriseSearchDeprecationCallout')).toHaveLength(1);
    });

    it('dismisses the deprecation callout', () => {
      setMockValues({ myRole: { canManageEngines: false } });

      const wrapper = mount(
        <IntlProvider locale="en">
          <EmptyState />
        </IntlProvider>
      );

      sessionStorage.setItem('appSearchHideDeprecationCallout', 'false');
      expect(wrapper.find('EnterpriseSearchDeprecationCallout')).toHaveLength(1);

      wrapper.find('button[data-test-subj="euiDismissCalloutButton"]').simulate('click');
      expect(wrapper.find('EnterpriseSearchDeprecationCallout')).toHaveLength(0);
      expect(sessionStorage.getItem('appSearchHideDeprecationCallout')).toEqual('true');
    });

    it('does not render the deprecation callout if dismissed', () => {
      sessionStorage.setItem('appSearchHideDeprecationCallout', 'true');
      setMockValues({ myRole: { canManageEngines: true } });
      const wrapper = shallow(<EmptyState />);
      expect(wrapper.find('EnterpriseSearchDeprecationCallout')).toHaveLength(0);
    });
  });
});
