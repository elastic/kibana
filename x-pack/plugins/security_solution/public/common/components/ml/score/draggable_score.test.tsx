/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { cloneDeep } from 'lodash/fp';
import { shallow } from 'enzyme';

import '../../../mock/match_media';
import { DraggableScoreComponent } from './draggable_score';
import { mockAnomalies } from '../mock';

describe('draggable_score', () => {
  let anomalies = cloneDeep(mockAnomalies);

  beforeEach(() => {
    anomalies = cloneDeep(mockAnomalies);
  });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <DraggableScoreComponent id="some-id" index={0} score={anomalies.anomalies[0]} />
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('renders correctly against snapshot when the index is not included', () => {
    const wrapper = shallow(
      <DraggableScoreComponent id="some-id" score={anomalies.anomalies[0]} />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
