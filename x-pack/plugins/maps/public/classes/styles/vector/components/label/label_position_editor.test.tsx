/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { LABEL_POSITIONS } from '../../../../../../common/constants';
import { LabelPositionEditor } from './label_position_editor';
import { LabelPositionProperty } from '../../properties/label_position_property';

const defaultProps = {
  handlePropertyChange: () => {},
  hasLabel: true,
  styleProperty: {
    isDisabled: () => {
      return false;
    },
    getOptions: () => {
      return {
        position: LABEL_POSITIONS.TOP,
      };
    },
  } as unknown as LabelPositionProperty,
};

test('should render', () => {
  const component = shallow(<LabelPositionEditor {...defaultProps} />);
  expect(component).toMatchSnapshot();
});

test('should render as disabled when label is not set', () => {
  const component = shallow(<LabelPositionEditor {...defaultProps} hasLabel={false} />);
  expect(component).toMatchSnapshot();
});

test('should render as disabled when label position is disabled', () => {
  const disabledLabelPosition = {
    isDisabled: () => {
      return true;
    },
    getOptions: () => {
      return {
        position: LABEL_POSITIONS.TOP,
      };
    },
    getDisabledReason: () => {
      return 'simulated disabled error';
    },
  } as unknown as LabelPositionProperty;
  const component = shallow(
    <LabelPositionEditor {...defaultProps} styleProperty={disabledLabelPosition} />
  );
  expect(component).toMatchSnapshot();
});
