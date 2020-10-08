/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { CredentialsList } from './credentials_list';
import { EuiBasicTable, EuiCopy } from '@elastic/eui';
import { IApiToken } from '../types';
import { ApiTokenTypes } from '../constants';

describe('Credentials', () => {
  const apiToken: IApiToken = {
    name: '',
    type: ApiTokenTypes.Private,
    read: true,
    write: true,
    access_all_engines: true,
    key: 'abc-1234',
  };

  // Kea mocks
  const values = {
    apiTokens: [],
    meta: {
      page: {
        current: 1,
        size: 10,
        total_pages: 1,
        total_results: 1,
      },
    },
  };
  const actions = {
    deleteApiKey: jest.fn(),
    fetchCredentials: jest.fn(),
    showCredentialsForm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<CredentialsList />);
    expect(wrapper.find(EuiBasicTable)).toHaveLength(1);
  });

  describe('items', () => {
    it('sorts items by id', () => {
      setMockValues({
        ...values,
        apiTokens: [
          {
            ...apiToken,
            id: 2,
          },
          {
            ...apiToken,
            id: undefined,
          },
          {
            ...apiToken,
            id: 1,
          },
        ],
      });
      const wrapper = shallow(<CredentialsList />);
      const { items } = wrapper.find(EuiBasicTable).props();
      expect(items.map((i: IApiToken) => i.id)).toEqual([undefined, 1, 2]);
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
      const wrapper = shallow(<CredentialsList />);
      const { pagination } = wrapper.find(EuiBasicTable).props();
      expect(pagination).toEqual({
        pageIndex: 5,
        pageSize: 55,
        totalItemCount: 1004,
        hidePerPageOptions: true,
      });
    });

    it('will default pagination values if `page` is not available', () => {
      setMockValues({ ...values, meta: {} });
      const wrapper = shallow(<CredentialsList />);
      const { pagination } = wrapper.find(EuiBasicTable).props();
      expect(pagination).toEqual({
        pageIndex: 0,
        pageSize: 0,
        totalItemCount: 0,
        hidePerPageOptions: true,
      });
    });
  });

  describe('columns', () => {
    let columns: any[];

    beforeAll(() => {
      const wrapper = shallow(<CredentialsList />);
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

    describe('column 2 (type)', () => {
      const token = {
        ...apiToken,
        type: ApiTokenTypes.Private,
      };

      it('renders correctly', () => {
        const column = columns[1];
        const wrapper = shallow(<div>{column.render(token)}</div>);
        expect(wrapper.text()).toEqual('Private API Key');
      });
    });

    describe('column 3 (key)', () => {
      const testToken = {
        ...apiToken,
        key: 'abc-123',
      };

      it('renders the credential and a button to copy it', () => {
        const copyMock = jest.fn();
        const column = columns[2];
        const wrapper = shallow(<div>{column.render(testToken)}</div>);
        const children = wrapper.find(EuiCopy).props().children;
        const copyEl = shallow(<div>{children(copyMock)}</div>);
        expect(copyEl.find('EuiButtonIcon').props().onClick).toEqual(copyMock);
        expect(copyEl.text()).toContain('abc-123');
      });

      it('renders nothing if no key is present', () => {
        const tokenWithNoKey = {
          key: undefined,
        };
        const column = columns[2];
        const wrapper = shallow(<div>{column.render(tokenWithNoKey)}</div>);
        expect(wrapper.text()).toBe('');
      });
    });

    describe('column 4 (modes)', () => {
      const token = {
        ...apiToken,
        type: ApiTokenTypes.Admin,
      };

      it('renders correctly', () => {
        const column = columns[3];
        const wrapper = shallow(<div>{column.render(token)}</div>);
        expect(wrapper.text()).toEqual('--');
      });
    });

    describe('column 5 (engines)', () => {
      const token = {
        ...apiToken,
        type: ApiTokenTypes.Private,
        access_all_engines: true,
      };

      it('renders correctly', () => {
        const column = columns[4];
        const wrapper = shallow(<div>{column.render(token)}</div>);
        expect(wrapper.text()).toEqual('all');
      });
    });

    describe('column 6 (edit action)', () => {
      const token = apiToken;

      it('calls showCredentialsForm when clicked', () => {
        const action = columns[5].actions[0];
        action.onClick(token);
        expect(actions.showCredentialsForm).toHaveBeenCalledWith(token);
      });
    });

    describe('column 7 (delete action)', () => {
      const token = {
        ...apiToken,
        name: 'some-name',
      };

      it('calls deleteApiKey when clicked', () => {
        const action = columns[5].actions[1];
        action.onClick(token);
        expect(actions.deleteApiKey).toHaveBeenCalledWith('some-name');
      });
    });
  });

  describe('onChange', () => {
    it('will handle pagination by calling `fetchCredentials`', () => {
      const wrapper = shallow(<CredentialsList />);
      const { onChange } = wrapper.find(EuiBasicTable).props();

      onChange({
        page: {
          size: 10,
          index: 2,
        },
      });

      expect(actions.fetchCredentials).toHaveBeenCalledWith(3);
    });
  });
});
