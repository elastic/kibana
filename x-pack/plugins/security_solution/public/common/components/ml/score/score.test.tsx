/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import { cloneDeep } from 'lodash/fp';
import React from 'react';

import { mockAnomalies } from '../mock';
import { ScoreComponent } from './score';

describe('draggable_score', () => {
  let anomalies = cloneDeep(mockAnomalies);

  beforeEach(() => {
    anomalies = cloneDeep(mockAnomalies);
  });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(<ScoreComponent index={0} score={anomalies.anomalies[0]} />);
    expect(wrapper).toMatchSnapshot();
  });

  test('renders correctly against snapshot when the index is not included', () => {
    const wrapper = shallow(<ScoreComponent score={anomalies.anomalies[0]} />);
    expect(wrapper).toMatchSnapshot();
  });
});
