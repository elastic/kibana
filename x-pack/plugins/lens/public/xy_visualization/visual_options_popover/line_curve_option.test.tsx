/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallowWithIntl as shallow, mountWithIntl as mount } from '@kbn/test/jest';
import { EuiSwitch } from '@elastic/eui';
import { LineCurveOption } from './line_curve_option';
import { CurveType } from '@elastic/charts';

describe('Line curve option', () => {
  it('should show currently selected line curve option', () => {
    const component = shallow(
      <LineCurveOption onChange={jest.fn()} value={CurveType.CURVE_MONOTONE_X} />
    );

    expect(component.find(EuiSwitch).prop('checked')).toEqual(true);
  });

  it('should show currently curving diabled', () => {
    const component = shallow(<LineCurveOption onChange={jest.fn()} value={CurveType.LINEAR} />);

    expect(component.find(EuiSwitch).prop('checked')).toEqual(false);
  });

  it('should show curving option when enabled', () => {
    const component = mount(
      <LineCurveOption onChange={jest.fn()} value={CurveType.LINEAR} isCurveTypeEnabled={true} />
    );

    expect(component.exists('[data-test-subj="lnsCurveStyleToggle"]')).toEqual(true);
  });

  it('should hide curve option when disabled', () => {
    const component = mount(
      <LineCurveOption onChange={jest.fn()} value={CurveType.LINEAR} isCurveTypeEnabled={false} />
    );

    expect(component.exists('[data-test-subj="lnsCurveStyleToggle"]')).toEqual(false);
  });
});
