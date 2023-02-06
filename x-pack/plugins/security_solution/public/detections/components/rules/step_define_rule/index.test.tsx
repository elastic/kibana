/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { StepDefineRule, aggregatableFields } from '.';
import { stepDefineDefaultValue } from '../../../pages/detection_engine/rules/utils';
import { mockBrowserFields } from '../../../../common/containers/source/mock';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/hooks/use_selector', () => {
  const actual = jest.requireActual('../../../../common/hooks/use_selector');
  return {
    ...actual,
    useDeepEqualSelector: () => ({
      kibanaDataViews: [{ id: 'world' }],
      sourcererScope: 'my-selected-dataview-id',
      selectedDataView: {
        id: 'security-solution',
        browserFields: mockBrowserFields,
        patternList: [],
      },
    }),
  };
});
jest.mock('../../../../common/components/link_to', () => {
  const originalModule = jest.requireActual('../../../../common/components/link_to');
  return {
    ...originalModule,
    getTimelineUrl: jest.fn(),
    useFormatUrl: jest.fn().mockReturnValue({
      formatUrl: jest.fn().mockImplementation((path: string) => path),
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

jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: jest.fn(),
  };
});

test('aggregatableFields', function () {
  expect(
    aggregatableFields([
      {
        name: 'error.message',
        type: 'string',
        esTypes: ['text'],
        searchable: true,
        aggregatable: false,
        readFromDocValues: false,
      },
    ])
  ).toEqual([]);
});

test('aggregatableFields with aggregatable: true', function () {
  expect(
    aggregatableFields([
      {
        name: 'error.message',
        type: 'string',
        esTypes: ['text'],
        searchable: true,
        aggregatable: false,
        readFromDocValues: false,
      },
      {
        name: 'file.path',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: false,
      },
    ])
  ).toEqual([
    {
      name: 'file.path',
      type: 'string',
      esTypes: ['keyword'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: false,
    },
  ]);
});

describe('StepDefineRule', () => {
  it('renders correctly', () => {
    const wrapper = shallow(
      <StepDefineRule
        isReadOnlyView={false}
        isLoading={false}
        indicesConfig={[]}
        threatIndicesConfig={[]}
        defaultValues={stepDefineDefaultValue}
      />
    );

    expect(wrapper.find('Form[data-test-subj="stepDefineRule"]')).toHaveLength(1);
  });
});
