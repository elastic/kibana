/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../__mocks__/kea.mock';
import { mockTelemetryActions } from '../../../../__mocks__';

import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import { EuiEmptyPrompt } from '@elastic/eui';

import { EmptyState } from './';

describe('EmptyState', () => {
  it('renders', () => {
    const wrapper = shallow(<EmptyState />);

    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
  });

  describe('CTA Button', () => {
    let wrapper: ShallowWrapper;
    let prompt: ShallowWrapper;
    let button: ShallowWrapper;

    beforeEach(() => {
      wrapper = shallow(<EmptyState />);
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
