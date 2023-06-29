/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl as mount, shallowWithIntl as shallow } from '@kbn/test-jest-helpers';
import { EuiSuperSelect } from '@elastic/eui';
import { LineCurveOption } from './line_curve_option';
import { lineCurveDefinitions } from './line_curve_definitions';

describe('Line curve option', () => {
  it.each(lineCurveDefinitions.map((v) => v.type))(
    'should show currently line curve option - %s',
    (type) => {
      const component = shallow(<LineCurveOption onChange={jest.fn()} value={type} />);

      expect(component.find(EuiSuperSelect).first().prop('valueOfSelected')).toEqual(type);
    }
  );

  it('should show line curve option when enabled', () => {
    const component = mount(
      <LineCurveOption onChange={jest.fn()} value={'LINEAR'} enabled={true} />
    );

    expect(component.exists('[data-test-subj="lnsCurveStyleSelect"]')).toEqual(true);
  });

  it('should hide line curve option when disabled', () => {
    const component = mount(
      <LineCurveOption onChange={jest.fn()} value={'LINEAR'} enabled={false} />
    );

    expect(component.exists('[data-test-subj="lnsCurveStyleSelect"]')).toEqual(false);
  });
});
