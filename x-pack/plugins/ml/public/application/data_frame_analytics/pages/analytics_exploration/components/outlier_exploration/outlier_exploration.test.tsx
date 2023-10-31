/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { shallow } from 'enzyme';
import React from 'react';
import { OutlierExploration } from './outlier_exploration';
import { kibanaContextMock } from '../../../../../contexts/kibana/__mocks__/kibana_context';

// workaround to make React.memo() work with enzyme
jest.mock('react', () => {
  const r = jest.requireActual('react');
  return { ...r, memo: (x: any) => x };
});

describe('Data Frame Analytics: <Exploration />', () => {
  test('Minimal initialization', () => {
    const wrapper = shallow(
      <KibanaContextProvider services={kibanaContextMock.services}>
        <OutlierExploration jobId="the-job-id" />
      </KibanaContextProvider>
    );
    // Without the jobConfig being loaded, the component will just return empty.
    expect(wrapper.text()).toMatch('');
    // TODO Once React 16.9 is available we can write tests covering asynchronous hooks.
  });
});
