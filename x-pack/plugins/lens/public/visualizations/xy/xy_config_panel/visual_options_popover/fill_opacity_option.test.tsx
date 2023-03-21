/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl as mount, shallowWithIntl as shallow } from '@kbn/test-jest-helpers';
import { EuiRange } from '@elastic/eui';
import { FillOpacityOption } from './fill_opacity_option';

describe('Line curve option', () => {
  it('should show currently selected opacity value', () => {
    const component = shallow(<FillOpacityOption onChange={jest.fn()} value={0.3} />);

    expect(component.find(EuiRange).prop('value')).toEqual(0.3);
  });

  it('should show fill opacity option when enabled', () => {
    const component = mount(
      <FillOpacityOption onChange={jest.fn()} value={0.3} isFillOpacityEnabled={true} />
    );

    expect(component.exists('[data-test-subj="lnsFillOpacity"]')).toEqual(true);
  });

  it('should hide curve option when disabled', () => {
    const component = mount(
      <FillOpacityOption onChange={jest.fn()} value={1} isFillOpacityEnabled={false} />
    );

    expect(component.exists('[data-test-subj="lnsFillOpacity"]')).toEqual(false);
  });
});
