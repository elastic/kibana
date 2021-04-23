/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';
import { setMockValues, setMockActions, rerender } from '../../../__mocks__';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { LoadingState, EmptyState } from './components';
import { EnginesTable } from './components/tables/engines_table';
import { MetaEnginesTable } from './components/tables/meta_engines_table';

import { EnginesOverview } from './';

describe('EnginesOverview', () => {
  const values = {
    dataLoading: false,
    engines: [],
    enginesMeta: {
      page: {
        current: 1,
        size: 10,
        total_results: 0,
      },
    },
    enginesLoading: false,
    metaEngines: [],
    metaEnginesMeta: {
      page: {
        current: 1,
        size: 10,
        total_results: 0,
      },
    },
    metaEnginesLoading: false,
    hasPlatinumLicense: false,
    // AppLogic
    myRole: { canManageEngines: false },
    // MetaEnginesTableLogic
    expandedSourceEngines: {},
    conflictingEnginesSets: {},
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
      engines: ['test-engine'],
      enginesMeta: {
        page: {
          current: 1,
          size: 10,
          total_results: 100,
        },
      },
    };

    beforeEach(() => {
      jest.clearAllMocks();
      setMockValues(valuesWithEngines);
    });

    it('renders and calls the engines API', () => {
      const wrapper = shallow(<EnginesOverview />);

      expect(wrapper.find(EnginesTable)).toHaveLength(1);
      expect(actions.loadEngines).toHaveBeenCalled();
    });

    describe('when the user can manage/create engines', () => {
      it('renders a create engine button which takes users to the create engine page', () => {
        setMockValues({
          ...valuesWithEngines,
          myRole: { canManageEngines: true },
        });
        const wrapper = shallow(<EnginesOverview />);

        expect(
          wrapper.find('[data-test-subj="appSearchEnginesEngineCreationButton"]').prop('to')
        ).toEqual('/engine_creation');
      });
    });

    describe('when the account has a platinum license', () => {
      it('renders a 2nd meta engines table & makes a 2nd meta engines call', () => {
        setMockValues({
          ...valuesWithEngines,
          hasPlatinumLicense: true,
        });
        const wrapper = shallow(<EnginesOverview />);

        expect(wrapper.find(MetaEnginesTable)).toHaveLength(1);
        expect(actions.loadMetaEngines).toHaveBeenCalled();
      });

      describe('when the user can manage/create engines', () => {
        it('renders a create engine button which takes users to the create meta engine page', () => {
          setMockValues({
            ...valuesWithEngines,
            hasPlatinumLicense: true,
            myRole: { canManageEngines: true },
          });
          const wrapper = shallow(<EnginesOverview />);

          expect(
            wrapper.find('[data-test-subj="appSearchEnginesMetaEngineCreationButton"]').prop('to')
          ).toEqual('/meta_engine_creation');
        });
      });
    });

    describe('pagination', () => {
      const getTablePagination = (wrapper: ShallowWrapper) =>
        wrapper.find(EnginesTable).prop('pagination');

      it('passes down page data from the API', () => {
        const wrapper = shallow(<EnginesOverview />);
        const pagination = getTablePagination(wrapper);

        expect(pagination.totalItemCount).toEqual(100);
        expect(pagination.pageIndex).toEqual(0);
      });

      it('re-polls the API on page change', () => {
        const wrapper = shallow(<EnginesOverview />);

        setMockValues({
          ...valuesWithEngines,
          enginesMeta: {
            page: {
              ...valuesWithEngines.enginesMeta.page,
              current: 51,
            },
          },
        });
        rerender(wrapper);

        expect(actions.loadEngines).toHaveBeenCalledTimes(2);
        expect(getTablePagination(wrapper).pageIndex).toEqual(50);
      });

      it('calls onPagination handlers', () => {
        setMockValues({
          ...valuesWithEngines,
          hasPlatinumLicense: true,
          metaEngines: ['test-meta-engine'],
        });
        const wrapper = shallow(<EnginesOverview />);
        const pageEvent = { page: { index: 0 } };

        wrapper.find(EnginesTable).simulate('change', pageEvent);
        expect(actions.onEnginesPagination).toHaveBeenCalledWith(1);

        wrapper.find(MetaEnginesTable).simulate('change', pageEvent);
        expect(actions.onMetaEnginesPagination).toHaveBeenCalledWith(1);
      });
    });
  });
});
