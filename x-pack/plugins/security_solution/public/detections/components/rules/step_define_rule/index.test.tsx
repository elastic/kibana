/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { StepDefineRule, aggregatableFields } from '.';
import mockBrowserFields from './mock_browser_fields.json';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/hooks/use_selector', () => {
  const actual = jest.requireActual('../../../../common/hooks/use_selector');
  return {
    ...actual,
    useDeepEqualSelector: () => ({
      kibanaDataViews: [{ id: 'world' }],
      sourcererScope: 'my-selected-dataview-id',
    }),
  };
});
jest.mock('../../../../common/containers/sourcerer', () => {
  const actual = jest.requireActual('../../../../common/containers/sourcerer');
  return {
    ...actual,
    useSourcererDataView: jest
      .fn()
      .mockReturnValue({ indexPattern: ['fakeindex'], loading: false }),
  };
});
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '/alerts' }) };
});

test('aggregatableFields', function () {
  expect(aggregatableFields(mockBrowserFields)).toMatchSnapshot();
});

describe('StepDefineRule', () => {
  it('renders correctly', () => {
    const wrapper = shallow(<StepDefineRule isReadOnlyView={false} isLoading={false} />);

    expect(wrapper.find('Form[data-test-subj="stepDefineRule"]')).toHaveLength(1);
  });
});
