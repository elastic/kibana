/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/shallow_useeffect.mock';
import { setMockValues, setMockActions, rerender } from '../../../__mocks__';

import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';

import { LoadingState, EmptyState } from './components';
import { EnginesTable } from './engines_table';

import { EnginesOverview } from './';

describe('EnginesOverview', () => {
  const values = {
    hasPlatinumLicense: false,
    dataLoading: false,
    engines: [],
    enginesTotal: 0,
    enginesPage: 1,
    metaEngines: [],
    metaEnginesTotal: 0,
    metaEnginesPage: 1,
  };
  const actions = {
    loadEngines: jest.fn(),
    loadMetaEngines: jest.fn(),
    onEnginesPagination: jest.fn(),
    onMetaEnginesPagination: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  describe('non-happy-path states', () => {
    it('isLoading', () => {
      setMockValues({ ...values, dataLoading: true });
      const wrapper = shallow(<EnginesOverview />);

      expect(wrapper.find(LoadingState)).toHaveLength(1);
    });

    it('isEmpty', () => {
      setMockValues({ ...values, engines: [] });
      const wrapper = shallow(<EnginesOverview />);

      expect(wrapper.find(EmptyState)).toHaveLength(1);
    });
  });

  describe('happy-path states', () => {
    const valuesWithEngines = {
      ...values,
      dataLoading: false,
      engines: ['dummy-engine'],
      enginesTotal: 100,
      enginesPage: 1,
    };

    beforeEach(() => {
      setMockValues(valuesWithEngines);
    });

    it('renders and calls the engines API', async () => {
      const wrapper = shallow(<EnginesOverview />);

      expect(wrapper.find(EnginesTable)).toHaveLength(1);
      expect(actions.loadEngines).toHaveBeenCalled();
    });

    describe('when on a platinum license', () => {
      it('renders a 2nd meta engines table & makes a 2nd meta engines API call', async () => {
        setMockValues({
          ...valuesWithEngines,
          hasPlatinumLicense: true,
          metaEngines: ['dummy-meta-engine'],
        });
        const wrapper = shallow(<EnginesOverview />);

        expect(wrapper.find(EnginesTable)).toHaveLength(2);
        expect(actions.loadMetaEngines).toHaveBeenCalled();
      });
    });

    describe('pagination', () => {
      const getTablePagination = (wrapper: ShallowWrapper) =>
        wrapper.find(EnginesTable).prop('pagination');

      it('passes down page data from the API', async () => {
        const wrapper = shallow(<EnginesOverview />);
        const pagination = getTablePagination(wrapper);

        expect(pagination.totalEngines).toEqual(100);
        expect(pagination.pageIndex).toEqual(0);
      });

      it('re-polls the API on page change', async () => {
        const wrapper = shallow(<EnginesOverview />);

        setMockValues({ ...valuesWithEngines, enginesPage: 51 });
        rerender(wrapper);

        expect(actions.loadEngines).toHaveBeenCalledTimes(2);
        expect(getTablePagination(wrapper).pageIndex).toEqual(50);
      });
    });
  });
});
