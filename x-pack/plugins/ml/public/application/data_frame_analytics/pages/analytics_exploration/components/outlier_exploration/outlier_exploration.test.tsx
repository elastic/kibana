/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { MlContext } from '../../../../../contexts/ml';
import { kibanaContextValueMock } from '../../../../../contexts/ml/__mocks__/kibana_context_value';

import { OutlierExploration } from './outlier_exploration';

// workaround to make React.memo() work with enzyme
jest.mock('react', () => {
  const r = jest.requireActual('react');
  return { ...r, memo: (x: any) => x };
});

describe('Data Frame Analytics: <Exploration />', () => {
  test('Minimal initialization', () => {
    const wrapper = shallow(
      <MlContext.Provider value={kibanaContextValueMock}>
        <OutlierExploration jobId="the-job-id" />
      </MlContext.Provider>
    );
    // Without the jobConfig being loaded, the component will just return empty.
    expect(wrapper.text()).toMatch('');
    // TODO Once React 16.9 is available we can write tests covering asynchronous hooks.
  });
});
