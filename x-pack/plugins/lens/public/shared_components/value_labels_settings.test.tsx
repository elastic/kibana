/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallowWithIntl as shallow } from '@kbn/test-jest-helpers';
import { ValueLabelsSettings, VisualOptionsProps } from './value_labels_settings';

describe('Value labels Settings', () => {
  let props: VisualOptionsProps;
  beforeEach(() => {
    props = {
      onValueLabelChange: jest.fn(),
    };
  });

  it('should not render the component if not enabled', () => {
    const component = shallow(<ValueLabelsSettings {...props} isVisible={false} />);
    expect(component.find('[data-test-subj="lens-value-labels-visibility-btn"]').length).toEqual(0);
  });

  it('should set hide as default value', () => {
    const component = shallow(<ValueLabelsSettings {...props} />);
    expect(
      component.find('[data-test-subj="lens-value-labels-visibility-btn"]').prop('idSelected')
    ).toEqual(`value_labels_hide`);
  });

  it('should have called onValueLabelChange function on ButtonGroup change', () => {
    const component = shallow(<ValueLabelsSettings {...props} />);
    component
      .find('[data-test-subj="lens-value-labels-visibility-btn"]')
      .simulate('change', 'value_labels_inside');
    expect(props.onValueLabelChange).toHaveBeenCalled();
  });

  it('should render the passed value if given', () => {
    const component = shallow(<ValueLabelsSettings {...props} valueLabels="inside" />);
    expect(
      component.find('[data-test-subj="lens-value-labels-visibility-btn"]').prop('idSelected')
    ).toEqual(`value_labels_inside`);
  });
});
