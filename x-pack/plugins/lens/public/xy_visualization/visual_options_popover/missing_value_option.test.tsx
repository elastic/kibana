/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallowWithIntl as shallow, mountWithIntl as mount } from '@kbn/test/jest';
import { EuiSuperSelect, EuiButtonGroup } from '@elastic/eui';
import { MissingValuesOptions } from './missing_values_option';

describe('Missing values option', () => {
  it('should show currently selected fitting function', () => {
    const component = shallow(
      <MissingValuesOptions
        onFittingFnChange={jest.fn()}
        onValueLabelChange={jest.fn()}
        fittingFunction={'Carry'}
        valueLabels={'hide'}
      />
    );

    expect(component.find(EuiSuperSelect).prop('valueOfSelected')).toEqual('Carry');
  });

  it('should show currently selected value labels display setting', () => {
    const component = mount(
      <MissingValuesOptions
        onFittingFnChange={jest.fn()}
        onValueLabelChange={jest.fn()}
        fittingFunction={'Carry'}
        valueLabels={'inside'}
      />
    );

    expect(component.find(EuiButtonGroup).prop('idSelected')).toEqual('value_labels_inside');
  });

  it('should show display field when enabled', () => {
    const component = mount(
      <MissingValuesOptions
        onFittingFnChange={jest.fn()}
        onValueLabelChange={jest.fn()}
        fittingFunction={'Carry'}
        valueLabels={'inside'}
      />
    );

    expect(component.exists('[data-test-subj="lnsValueLabelsDisplay"]')).toEqual(true);
  });

  it('should hide in display value label option when disabled', () => {
    const component = mount(
      <MissingValuesOptions
        onFittingFnChange={jest.fn()}
        onValueLabelChange={jest.fn()}
        fittingFunction={'Carry'}
        valueLabels={'inside'}
        isValueLabelsEnabled={false}
      />
    );

    expect(component.exists('[data-test-subj="lnsValueLabelsDisplay"]')).toEqual(false);
  });

  it('should show the fitting option when enabled', () => {
    const component = mount(
      <MissingValuesOptions
        onFittingFnChange={jest.fn()}
        onValueLabelChange={jest.fn()}
        fittingFunction={'Carry'}
        valueLabels={'inside'}
        isFittingEnabled={true}
      />
    );

    expect(component.exists('[data-test-subj="lnsMissingValuesSelect"]')).toEqual(true);
  });

  it('should hide the fitting option when disabled', () => {
    const component = mount(
      <MissingValuesOptions
        onFittingFnChange={jest.fn()}
        onValueLabelChange={jest.fn()}
        fittingFunction={'Carry'}
        valueLabels={'inside'}
        isFittingEnabled={false}
      />
    );

    expect(component.exists('[data-test-subj="lnsMissingValuesSelect"]')).toEqual(false);
  });
});
