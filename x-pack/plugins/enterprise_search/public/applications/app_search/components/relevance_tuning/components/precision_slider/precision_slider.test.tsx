/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./utils', () => ({
  __esModule: true,
  getStepDescription: jest.fn(),
}));

import { setMockValues, setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { rerender } from '../../../../../test_helpers';

import { PrecisionSlider } from './precision_slider';
import { getStepDescription } from './utils';

const MOCK_VALUES = {
  // RelevanceTuningLogic
  searchSettings: {
    precision: 2,
  },
};

const MOCK_ACTIONS = {
  // RelevanceTuningLogic
  updatePrecision: jest.fn(),
};

describe('PrecisionSlider', () => {
  let wrapper: ShallowWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(MOCK_VALUES);
    setMockActions(MOCK_ACTIONS);
    wrapper = shallow(<PrecisionSlider />);
  });

  describe('Range Slider', () => {
    it('has the correct min and max', () => {
      expect(wrapper.find('[data-test-subj="PrecisionRange"]').prop('min')).toEqual(1);

      expect(wrapper.find('[data-test-subj="PrecisionRange"]').prop('max')).toEqual(11);
    });

    it('displays the correct value', () => {
      expect(wrapper.find('[data-test-subj="PrecisionRange"]').prop('value')).toEqual(2);
    });

    it('calls updatePrecision on change', () => {
      wrapper
        .find('[data-test-subj="PrecisionRange"]')
        .simulate('change', { target: { value: 10 } });

      expect(MOCK_ACTIONS.updatePrecision).toHaveBeenCalledWith(10);
    });
  });

  describe('Step Description', () => {
    it('is visible when there is a step description', () => {
      (getStepDescription as jest.Mock).mockImplementationOnce(() => 'test description');
      rerender(wrapper);

      expect(wrapper.find('[data-test-subj="StepDescription"]').render().text()).toEqual(
        'test description'
      );
    });

    it('is hidden when there is no step description', () => {
      (getStepDescription as jest.Mock).mockImplementationOnce(() => undefined);
      rerender(wrapper);

      expect(wrapper.find('[data-test-subj="StepDescription"]')).toHaveLength(0);
    });
  });
});
