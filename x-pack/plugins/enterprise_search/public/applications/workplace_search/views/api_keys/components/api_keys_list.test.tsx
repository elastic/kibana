/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiBasicTable, EuiCopy, EuiConfirmModal } from '@elastic/eui';

import { HiddenText } from '../../../../shared/hidden_text';

import { ApiKey } from './api_key';
import { ApiKeysList } from './api_keys_list';

describe('ApiKeysList', () => {
  const stageTokenNameForDeletion = jest.fn();
  const hideDeleteModal = jest.fn();
  const deleteApiKey = jest.fn();
  const onPaginate = jest.fn();
  const apiToken = {
    id: '1',
    name: 'test',
    key: 'foo',
  };
  const apiTokens = [apiToken];
  const meta = {
    page: {
      current: 1,
      size: 10,
      total_pages: 1,
      total_results: 5,
    },
  };

  const values = { apiTokens, meta, dataLoading: false };

  beforeEach(() => {
    setMockValues(values);
    setMockActions({ deleteApiKey, onPaginate, stageTokenNameForDeletion, hideDeleteModal });
  });

  it('renders', () => {
    const wrapper = shallow(<ApiKeysList />);

    expect(wrapper.find(EuiBasicTable)).toHaveLength(1);
  });

  describe('loading state', () => {
    it('renders as loading when dataLoading is true', () => {
      setMockValues({
        ...values,
        dataLoading: true,
      });
      const wrapper = shallow(<ApiKeysList />);

      expect(wrapper.find(EuiBasicTable).prop('loading')).toBe(true);
    });
  });

  describe('pagination', () => {
    it('derives pagination from meta object', () => {
      setMockValues({
        ...values,
        meta: {
          page: {
            current: 6,
            size: 55,
            total_pages: 1,
            total_results: 1004,
          },
        },
      });
      const wrapper = shallow(<ApiKeysList />);
      const { pagination } = wrapper.find(EuiBasicTable).props();

      expect(pagination).toEqual({
        pageIndex: 5,
        pageSize: 55,
        totalItemCount: 1004,
        showPerPageOptions: false,
      });
    });
  });

  it('handles confirmModal submission', () => {
    setMockValues({
      ...values,
      deleteModalVisible: true,
    });
    const wrapper = shallow(<ApiKeysList />);
    const modal = wrapper.find(EuiConfirmModal);
    modal.prop('onConfirm')!({} as any);

    expect(deleteApiKey).toHaveBeenCalled();
  });

  describe('columns', () => {
    let columns: any[];

    beforeAll(() => {
      setMockValues(values);
      const wrapper = shallow(<ApiKeysList />);
      columns = wrapper.find(EuiBasicTable).props().columns;
    });

    describe('column 1 (name)', () => {
      const token = {
        ...apiToken,
        name: 'some-name',
      };

      it('renders correctly', () => {
        const column = columns[0];
        const wrapper = shallow(<div>{column.render(token)}</div>);

        expect(wrapper.text()).toEqual('some-name');
      });
    });

    describe('column 2 (key)', () => {
      const token = {
        ...apiToken,
        key: 'abc-123',
      };

      it('renders nothing if no key is present', () => {
        const tokenWithNoKey = {
          key: undefined,
        };
        const column = columns[1];
        const wrapper = shallow(<div>{column.render(tokenWithNoKey)}</div>);

        expect(wrapper.text()).toBe('');
      });

      it('renders an EuiCopy component with the key', () => {
        const column = columns[1];
        const wrapper = shallow(<div>{column.render(token)}</div>);

        expect(wrapper.find(EuiCopy).props().textToCopy).toEqual('abc-123');
      });

      it('renders a HiddenText component with the key', () => {
        const column = columns[1];
        const wrapper = shallow(<div>{column.render(token)}</div>)
          .find(EuiCopy)
          .dive();

        expect(wrapper.find(HiddenText).props().text).toEqual('abc-123');
      });

      it('renders a Key component', () => {
        const column = columns[1];
        const wrapper = shallow(<div>{column.render(token)}</div>)
          .find(EuiCopy)
          .dive()
          .find(HiddenText)
          .dive();

        expect(wrapper.find(ApiKey).props()).toEqual({
          copy: expect.any(Function),
          toggleIsHidden: expect.any(Function),
          isHidden: expect.any(Boolean),
          text: (
            <span aria-label="Hidden text">
              <span aria-hidden>•••••••</span>
            </span>
          ),
        });
      });
    });

    describe('column 3 (delete action)', () => {
      const token = {
        ...apiToken,
        name: 'some-name',
      };

      it('calls stageTokenNameForDeletion when clicked', () => {
        const action = columns[2].actions[0];
        action.onClick(token);

        expect(stageTokenNameForDeletion).toHaveBeenCalledWith('some-name');
      });
    });
  });
});
