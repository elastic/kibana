/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues } from '../../../../__mocks__/kea.mock';

import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import { EuiStat } from '@elastic/eui';

import { TotalStats } from './total_stats';

describe('TotalStats', () => {
  let wrapper: ShallowWrapper;

  beforeAll(() => {
    jest.clearAllMocks();
    setMockValues({
      totalQueries: 11,
      documentCount: 22,
      totalClicks: 33,
    });
    wrapper = shallow(<TotalStats />);
  });

  it('renders the total queries stat', () => {
    expect(wrapper.find('[data-test-subj="TotalQueriesCard"]')).toHaveLength(1);

    const card = wrapper.find(EuiStat).at(0);
    expect(card.prop('title')).toEqual(11);
    expect(card.prop('description')).toEqual('Total queries');
  });

  it('renders the total documents stat', () => {
    expect(wrapper.find('[data-test-subj="TotalDocumentsCard"]')).toHaveLength(1);

    const card = wrapper.find(EuiStat).at(1);
    expect(card.prop('title')).toEqual(22);
    expect(card.prop('description')).toEqual('Total documents');
  });

  it('renders the total clicks stat', () => {
    expect(wrapper.find('[data-test-subj="TotalClicksCard"]')).toHaveLength(1);

    const card = wrapper.find(EuiStat).at(2);
    expect(card.prop('title')).toEqual(33);
    expect(card.prop('description')).toEqual('Total clicks');
  });
});
