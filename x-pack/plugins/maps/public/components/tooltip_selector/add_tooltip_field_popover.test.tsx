/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { AddTooltipFieldPopover } from './add_tooltip_field_popover';

const defaultProps = {
  fields: [
    {
      name: 'prop1',
      label: 'custom label for prop1',
      type: 'string',
    },
    {
      name: 'prop2',
      label: 'prop2-label',
      type: 'string',
    },
    {
      name: '@timestamp',
      label: '@timestamp-label',
      type: 'date',
    },
  ],
  selectedFields: [],
  onAdd: () => {},
};

test('Should render', () => {
  const component = shallow(<AddTooltipFieldPopover {...defaultProps} />);

  expect(component).toMatchSnapshot();
});

test('Should remove selected fields from selectable', () => {
  const component = shallow(
    <AddTooltipFieldPopover
      {...defaultProps}
      selectedFields={[
        { name: 'prop2', label: 'prop2-label', type: 'string' },
        { name: 'prop1', label: 'prop1-label', type: 'string' },
      ]}
    />
  );

  expect(component).toMatchSnapshot();
});
