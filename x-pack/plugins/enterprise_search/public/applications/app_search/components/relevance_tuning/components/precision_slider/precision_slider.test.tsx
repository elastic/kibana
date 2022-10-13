/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { docLinks } from '../../../../../shared/doc_links';

import { rerender } from '../../../../../test_helpers';

import { STEP_DESCRIPTIONS } from './constants';
import { PrecisionSlider } from './precision_slider';

const MOCK_VALUES = {
  // RelevanceTuningLogic
  searchSettings: {
    precision: 2,
  },
};

const MOCK_ACTIONS = {
  // RelevanceTuningLogic
  setPrecision: jest.fn(),
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

    it('updates the precision on change', () => {
      wrapper
        .find('[data-test-subj="PrecisionRange"]')
        .simulate('change', { target: { value: 10 } });

      expect(MOCK_ACTIONS.setPrecision).toHaveBeenCalledWith(10);
    });
  });

  describe('Step Description', () => {
    it('is visible when there is a step description', () => {
      setMockValues({
        ...MOCK_VALUES,
        searchSettings: { ...MOCK_VALUES.searchSettings, precision: 10 },
      });
      rerender(wrapper);

      expect(wrapper.find('[data-test-subj="StepDescription"]').render().text()).toEqual(
        STEP_DESCRIPTIONS[10]
      );
    });

    it('is hidden when there is no step description', () => {
      setMockValues({ ...MOCK_VALUES, precision: 14 });
      rerender(wrapper);

      expect(wrapper.contains('[data-test-subj="StepDescription"]')).toBe(false);
    });
  });

  it('contains a documentation link', () => {
    const documentationLink = wrapper.find('[data-test-subj="documentationLink"]');

    expect(documentationLink.prop('href')).toContain(docLinks.appSearchPrecision);
    expect(documentationLink.prop('target')).toEqual('_blank');
  });
});
