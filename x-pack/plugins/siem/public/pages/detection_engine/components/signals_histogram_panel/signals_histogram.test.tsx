/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { SignalsHistogram } from './signals_histogram';

jest.mock('../../../../lib/kibana');

describe('SignalsHistogram', () => {
  it('renders correctly', () => {
    const wrapper = shallow(
      <SignalsHistogram
        legendItems={[]}
        loading={false}
        data={[]}
        from={0}
        to={1}
        updateDateRange={jest.fn()}
      />
    );

    expect(wrapper.find('Chart')).toBeTruthy();
  });
});
