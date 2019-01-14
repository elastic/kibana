/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { SelectSeverity } from './select_severity';


const severityService = {
  state: {
    'threshold': { color: '#d2e9f7', display: 'warning', val: 0 },
    get: () => ({ color: '#d2e9f7', display: 'warning', val: 0 }),
    set: () => ({
      changed: () => {}
    })
  }
};

describe('SelectSeverity', () => {

  test('creates correct severity options and initial selected value', () => {
    const wrapper = shallowWithIntl(<SelectSeverity mlSelectSeverityService={severityService}/>);
    const options = wrapper.props().options;
    const defaultSelectedValue = wrapper.props().valueOfSelected;

    expect(defaultSelectedValue).toBe('warning');
    expect(options.length).toEqual(4);

    // excpect options Array to equal Array containing Object that contains the property
    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'warning'
        })
      ])
    );

    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'minor'
        })
      ])
    );

    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'major'
        })
      ])
    );

    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'critical'
        })
      ])
    );
  });

  test('state for currently selected value is updated correctly on click', () => {
    const wrapper = shallowWithIntl(<SelectSeverity mlSelectSeverityService={severityService} />);

    const defaultSelectedValue = wrapper.props().valueOfSelected;
    expect(defaultSelectedValue).toBe('warning');

    wrapper.simulate('change', 'critical');
    const updatedSelectedValue = wrapper.props().valueOfSelected;
    expect(updatedSelectedValue).toBe('critical');
  });

});
