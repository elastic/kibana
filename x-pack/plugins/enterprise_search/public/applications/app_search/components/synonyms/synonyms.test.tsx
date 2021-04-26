/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions, rerender } from '../../../__mocks__';
import '../../../__mocks__/shallow_useeffect.mock';
import '../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiPageHeader, EuiButton, EuiPagination } from '@elastic/eui';

import { Loading } from '../../../shared/loading';

import { SynonymCard, EmptyState } from './components';

import { Synonyms } from './';

describe('Synonyms', () => {
  const MOCK_SYNONYM_SET = {
    id: 'syn-1234567890',
    synonyms: ['a', 'b', 'c'],
  };

  const values = {
    synonymSets: [MOCK_SYNONYM_SET, MOCK_SYNONYM_SET, MOCK_SYNONYM_SET],
    meta: { page: { current: 1 } },
    dataLoading: false,
  };
  const actions = {
    loadSynonyms: jest.fn(),
    onPaginate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<Synonyms />);

    expect(wrapper.find(SynonymCard)).toHaveLength(3);
    // TODO: Check for synonym modal
  });

  it('renders a create action button', () => {
    const wrapper = shallow(<Synonyms />)
      .find(EuiPageHeader)
      .dive()
      .children()
      .dive();

    wrapper.find(EuiButton).simulate('click');
    // TODO: Expect open modal action
  });

  it('renders an empty state if no synonyms exist', () => {
    setMockValues({ ...values, synonymSets: [] });
    const wrapper = shallow(<Synonyms />);

    expect(wrapper.find(EmptyState)).toHaveLength(1);
  });

  describe('loading', () => {
    it('renders a loading state on initial page load', () => {
      setMockValues({ ...values, synonymSets: [], dataLoading: true });
      const wrapper = shallow(<Synonyms />);

      expect(wrapper.find(Loading)).toHaveLength(1);
    });

    it('does not render a full loading state after initial page load', () => {
      setMockValues({ ...values, synonymSets: [MOCK_SYNONYM_SET], dataLoading: true });
      const wrapper = shallow(<Synonyms />);

      expect(wrapper.find(Loading)).toHaveLength(0);
    });
  });

  describe('API & pagination', () => {
    it('loads synonyms on page load and on pagination', () => {
      const wrapper = shallow(<Synonyms />);
      expect(actions.loadSynonyms).toHaveBeenCalledTimes(1);

      setMockValues({ ...values, meta: { page: { current: 5 } } });
      rerender(wrapper);
      expect(actions.loadSynonyms).toHaveBeenCalledTimes(2);
    });

    it('automatically paginations users back a page if they delete the only remaining synonym on the page', () => {
      setMockValues({ ...values, meta: { page: { current: 5 } }, synonymSets: [] });
      shallow(<Synonyms />);

      expect(actions.onPaginate).toHaveBeenCalledWith(4);
    });

    it('does not paginate backwards if the user is on the first page (should show the state instead)', () => {
      setMockValues({ ...values, meta: { page: { current: 1 } }, synonymSets: [] });
      const wrapper = shallow(<Synonyms />);

      expect(actions.onPaginate).not.toHaveBeenCalled();
      expect(wrapper.find(EmptyState)).toHaveLength(1);
    });

    it('handles off-by-one shenanigans between EuiPagination and our API', () => {
      setMockValues({
        ...values,
        meta: { page: { total_pages: 10, current: 1 } },
      });
      const wrapper = shallow(<Synonyms />);
      const pagination = wrapper.find(EuiPagination);

      expect(pagination.prop('pageCount')).toEqual(10);
      expect(pagination.prop('activePage')).toEqual(0);

      pagination.simulate('pageClick', 4);
      expect(actions.onPaginate).toHaveBeenCalledWith(5);
    });
  });
});
