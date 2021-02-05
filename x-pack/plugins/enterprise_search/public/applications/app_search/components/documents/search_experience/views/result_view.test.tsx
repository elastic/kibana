/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { ResultView } from '.';
import { Result } from '../../../result/result';

describe('ResultView', () => {
  const result = {
    id: {
      raw: '1',
    },
    title: {
      raw: 'A title',
    },
    _meta: {
      id: '1',
      scopedId: '1',
      score: 100,
      engine: 'my-engine',
    },
  };

  it('renders', () => {
    const wrapper = shallow(<ResultView result={result} />);
    expect(wrapper.find(Result).exists()).toBe(true);
  });
});
