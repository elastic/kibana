/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { Suggestion } from './suggestion';

const defaultProps = {
  innerRef: () => {},
  onClick: () => {},
  onMouseEnter: () => {},
  selected: true,
  suggestion: {
    description: '<p>Test description for fieldValue</p>',
    end: 1,
    start: 0,
    text: 'fieldValue',
    type: 'field'
  }
};

describe('Suggestion', () => {

  test('snapshot', () => {
    const wrapper = shallow(<Suggestion {...defaultProps}/>);
    expect(wrapper).toMatchSnapshot();
  });

});
