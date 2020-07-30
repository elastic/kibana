/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import '../../../common/mock/match_media';
import { AlertsHistogram } from './alerts_histogram';

jest.mock('../../../common/lib/kibana');

describe('AlertsHistogram', () => {
  it('renders correctly', () => {
    const wrapper = shallow(
      <AlertsHistogram
        legendItems={[]}
        loading={false}
        data={[]}
        from={'2020-07-07T08:20:18.966Z'}
        to={'2020-07-08T08:20:18.966Z'}
        updateDateRange={jest.fn()}
      />
    );

    expect(wrapper.find('Chart')).toBeTruthy();
  });
});
