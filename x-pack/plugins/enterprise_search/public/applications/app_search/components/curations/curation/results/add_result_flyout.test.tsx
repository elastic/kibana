/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFlyout, EuiFieldSearch, EuiEmptyPrompt } from '@elastic/eui';

import { CurationResult, AddResultFlyout } from '.';

describe('AddResultFlyout', () => {
  const values = {
    searchDataLoading: false,
    searchQuery: '',
    searchResults: [],
    promotedIds: [],
    hiddenIds: [],
  };
  const actions = {
    search: jest.fn(),
    closeFlyout: jest.fn(),
    addPromotedId: jest.fn(),
    removePromotedId: jest.fn(),
    addHiddenId: jest.fn(),
    removeHiddenId: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders a closeable flyout', () => {
    const wrapper = shallow(<AddResultFlyout />);
    expect(wrapper.find(EuiFlyout)).toHaveLength(1);

    wrapper.find(EuiFlyout).simulate('close');
    expect(actions.closeFlyout).toHaveBeenCalled();
  });

  describe('search input', () => {
    it('renders isLoading state correctly', () => {
      setMockValues({ ...values, searchDataLoading: true });
      const wrapper = shallow(<AddResultFlyout />);

      expect(wrapper.find(EuiFieldSearch).prop('isLoading')).toEqual(true);
    });

    it('renders value correctly', () => {
      setMockValues({ ...values, searchQuery: 'hello world' });
      const wrapper = shallow(<AddResultFlyout />);

      expect(wrapper.find(EuiFieldSearch).prop('value')).toEqual('hello world');
    });

    it('calls search on input change', () => {
      const wrapper = shallow(<AddResultFlyout />);
      wrapper.find(EuiFieldSearch).simulate('change', { target: { value: 'lorem ipsum' } });

      expect(actions.search).toHaveBeenCalledWith('lorem ipsum');
    });
  });

  describe('search results', () => {
    it('renders an empty state', () => {
      setMockValues({ ...values, searchResults: [] });
      const wrapper = shallow(<AddResultFlyout />);

      expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
      expect(wrapper.find(CurationResult)).toHaveLength(0);
    });

    it('renders a result component for each item in searchResults', () => {
      setMockValues({
        ...values,
        searchResults: [
          { id: { raw: 'doc-1' } },
          { id: { raw: 'doc-2' } },
          { id: { raw: 'doc-3' } },
        ],
      });
      const wrapper = shallow(<AddResultFlyout />);

      expect(wrapper.find(CurationResult)).toHaveLength(3);
    });

    describe('actions', () => {
      it('renders a hide result button if the document ID is not already in the hiddenIds list', () => {
        setMockValues({
          ...values,
          searchResults: [{ id: { raw: 'visible-document' } }],
          hiddenIds: ['hidden-document'],
        });
        const wrapper = shallow(<AddResultFlyout />);
        wrapper.find(CurationResult).prop('actions')[0].onClick();

        expect(actions.addHiddenId).toHaveBeenCalledWith('visible-document');
      });

      it('renders a show result button if the document ID is already in the hiddenIds list', () => {
        setMockValues({
          ...values,
          searchResults: [{ id: { raw: 'hidden-document' } }],
          hiddenIds: ['hidden-document'],
        });
        const wrapper = shallow(<AddResultFlyout />);
        wrapper.find(CurationResult).prop('actions')[0].onClick();

        expect(actions.removeHiddenId).toHaveBeenCalledWith('hidden-document');
      });

      it('renders a promote result button if the document ID is not already in the promotedIds list', () => {
        setMockValues({
          ...values,
          searchResults: [{ id: { raw: 'some-document' } }],
          promotedIds: ['promoted-document'],
        });
        const wrapper = shallow(<AddResultFlyout />);
        wrapper.find(CurationResult).prop('actions')[1].onClick();

        expect(actions.addPromotedId).toHaveBeenCalledWith('some-document');
      });

      it('renders a demote result button if the document ID is already in the promotedIds list', () => {
        setMockValues({
          ...values,
          searchResults: [{ id: { raw: 'promoted-document' } }],
          promotedIds: ['promoted-document'],
        });
        const wrapper = shallow(<AddResultFlyout />);
        wrapper.find(CurationResult).prop('actions')[1].onClick();

        expect(actions.removePromotedId).toHaveBeenCalledWith('promoted-document');
      });
    });
  });
});
