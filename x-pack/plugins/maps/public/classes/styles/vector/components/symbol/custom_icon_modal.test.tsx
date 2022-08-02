/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { CustomIconModal } from './custom_icon_modal';

const defaultProps = {
  cutoff: 0.25,
  onCancel: () => {},
  onSave: () => {},
  radius: 0.25,
  title: 'Custom Icon',
};

test('should render an empty custom icon modal', () => {
  const component = shallow(<CustomIconModal {...defaultProps} />);

  expect(component).toMatchSnapshot();
});

test('should render a custom icon modal with an existing icon', () => {
  const component = shallow(
    <CustomIconModal
      {...defaultProps}
      cutoff={0.3}
      label="square"
      onDelete={() => {}}
      radius={0.15}
      svg='<svg width="200" height="250" xmlns="http://www.w3.org/2000/svg"><path stroke="#000" fill="transparent" stroke-width="5" d="M10 10h30v30H10z"/></svg>'
      symbolId="__kbn__custom_icon_sdf__foobar"
      title="Edit custom icon"
    />
  );

  expect(component).toMatchSnapshot();
});
