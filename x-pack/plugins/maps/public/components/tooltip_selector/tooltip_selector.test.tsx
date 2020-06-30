/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { TooltipSelector } from './tooltip_selector';
import { AbstractField } from '../../classes/fields/field';
import { FIELD_ORIGIN } from '../../../common/constants';

class MockField extends AbstractField {
  private _label?: string;
  constructor({ name, label }: { name: string; label?: string }) {
    super({ fieldName: name, origin: FIELD_ORIGIN.SOURCE });
    this._label = label;
  }

  async getLabel() {
    return this._label || 'foobar_label';
  }
}

const defaultProps = {
  tooltipFields: [new MockField({ name: 'iso2' })],
  onChange: () => {},
  fields: [
    new MockField({
      name: 'iso2',
      label: 'ISO 3166-1 alpha-2 code',
    }),
    new MockField({
      name: 'iso3',
    }),
  ],
};

describe('TooltipSelector', () => {
  test('should render component', async () => {
    const component = shallow(<TooltipSelector {...defaultProps} />);

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();
    expect(component).toMatchSnapshot();
  });
});
