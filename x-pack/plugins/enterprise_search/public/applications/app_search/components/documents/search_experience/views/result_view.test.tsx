/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { ResultView } from '.';

describe('ResultView', () => {
  const result = {
    id: {
      raw: '1',
    },
  };

  it('renders', () => {
    const wrapper = shallow(<ResultView result={result} engineName="engine1" />);
    expect(wrapper.find('div').length).toBe(1);
  });
});
