/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { ResultField } from './result_field';

describe('ResultField', () => {
  it('renders', () => {
    const wrapper = shallow(
      <ResultField
        field="title"
        raw="The Catcher in the Rye"
        snippet="The <em>Catcher</em> in the Rye"
        type="string"
      />
    );
    expect(wrapper.find('ResultFieldValue').exists()).toBe(true);
  });
});
