/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/kea.mock';
import { setMockValues, mockTelemetryActions } from '../../../../__mocks__';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiEmptyPrompt } from '@elastic/eui';

import { EmptyState } from './';

describe('EmptyState', () => {
  describe('when the user can manage/create engines', () => {
    let wrapper: ShallowWrapper;

    beforeAll(() => {
      setMockValues({ myRole: { canManageEngines: true } });
      wrapper = shallow(<EmptyState />);
    });

    it('renders a prompt to create an engine', () => {
      expect(wrapper.find('[data-test-subj="AdminEmptyEnginesPrompt"]')).toHaveLength(1);
    });

    describe('create engine button', () => {
      let prompt: ShallowWrapper;
      let button: ShallowWrapper;

      beforeAll(() => {
        prompt = wrapper.find(EuiEmptyPrompt).dive();
        button = prompt.find('[data-test-subj="EmptyStateCreateFirstEngineCta"]');
      });

      it('sends telemetry on create first engine click', () => {
        button.simulate('click');
        expect(mockTelemetryActions.sendAppSearchTelemetry).toHaveBeenCalled();
      });

      it('sends a user to engine creation', () => {
        expect(button.prop('to')).toEqual('/engine_creation');
      });
    });
  });

  describe('when the user cannot manage/create engines', () => {
    beforeAll(() => {
      setMockValues({ myRole: { canManageEngines: false } });
    });

    it('renders a prompt to contact the App Search admin', () => {
      const wrapper = shallow(<EmptyState />);

      expect(wrapper.find('[data-test-subj="NonAdminEmptyEnginesPrompt"]')).toHaveLength(1);
    });
  });
});
