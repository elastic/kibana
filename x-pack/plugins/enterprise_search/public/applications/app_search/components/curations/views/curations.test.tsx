/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';
import '../../../../__mocks__/react_router';
import '../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { mountWithIntl, getPageTitle } from '../../../../test_helpers';

import { CurationsTable } from '../components';

import { Curations } from './curations';

describe('Curations', () => {
  const values = {
    dataLoading: false,
    curations: [
      {
        id: 'cur-id-1',
        last_updated: 'January 1, 1970 at 12:00PM',
        queries: ['hiking'],
      },
      {
        id: 'cur-id-2',
        last_updated: 'January 2, 1970 at 12:00PM',
        queries: ['mountains', 'valleys'],
      },
    ],
    meta: {
      page: {
        current: 1,
        size: 10,
        total_results: 2,
      },
    },
  };

  const actions = {
    loadCurations: jest.fn(),
    deleteCuration: jest.fn(),
    onPaginate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<Curations />);

    expect(getPageTitle(wrapper)).toEqual('Curated results');
    expect(wrapper.find(CurationsTable)).toHaveLength(1);
  });

  describe('loading state', () => {
    it('renders a full-page loading state on initial page load', () => {
      setMockValues({ ...values, dataLoading: true, curations: [] });
      const wrapper = shallow(<Curations />);

      expect(wrapper.prop('isLoading')).toEqual(true);
    });

    it('does not re-render a full-page loading state after initial page load (uses component-level loading state instead)', () => {
      setMockValues({ ...values, dataLoading: true, curations: [{}] });
      const wrapper = shallow(<Curations />);

      expect(wrapper.prop('isLoading')).toEqual(false);
    });
  });

  it('calls loadCurations on page load', () => {
    setMockValues({ ...values, myRole: {} }); // Required for AppSearchPageTemplate to load
    mountWithIntl(<Curations />);

    expect(actions.loadCurations).toHaveBeenCalledTimes(1);
  });
});
