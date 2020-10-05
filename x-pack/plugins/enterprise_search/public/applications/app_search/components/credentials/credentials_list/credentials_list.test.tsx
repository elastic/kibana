/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import '../../../../__mocks__/kea.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { useValues, useActions } from 'kea';

import { CredentialsList } from './credentials_list';
import { Credential } from './credential';
import { EuiBasicTable, EuiCopy, EuiEmptyPrompt } from '@elastic/eui';
import { HiddenText } from '../../../../shared/hidden_text';
import { IApiToken } from '../types';
import { ADMIN, PRIVATE } from '../constants';

describe('Credentials', () => {
  const apiToken: IApiToken = {
    name: '',
    type: PRIVATE,
    read: true,
    write: true,
    access_all_engines: true,
    key: 'abc-1234',
  };

  const mockKea = ({ values = {}, actions = {} }) => {
    const mergedValues = {
      apiTokens: [],
      meta: {
        page: {
          current: 1,
          size: 10,
          total_pages: 1,
          total_results: 1,
        },
      },
      ...values,
    };

    const mergedActions = {
      deleteApiKey: jest.fn(),
      fetchCredentials: jest.fn(),
      showCredentialsForm: jest.fn(),
      ...actions,
    };

    (useValues as jest.Mock).mockImplementationOnce(() => mergedValues);
    (useActions as jest.Mock).mockImplementationOnce(() => mergedActions);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    mockKea({
      values: {
        apiTokens: [apiToken],
      },
    });
    const wrapper = shallow(<CredentialsList />);
    expect(wrapper.find(EuiBasicTable)).toHaveLength(1);
  });

  describe('items', () => {
    it('sorts itmes by id', () => {
      mockKea({
        values: {
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
        },
      });
      const wrapper = shallow(<CredentialsList />);
      const { items } = wrapper.find(EuiBasicTable).props();
      expect(items.map((i: IApiToken) => i.id)).toEqual([undefined, 1, 2]);
    });
  });

  describe('empty state', () => {
    it('renders an EuiEmptyState when no credentials are available', () => {
      mockKea({
        values: {
          apiTokens: [],
        },
      });
      const wrapper = shallow(<CredentialsList />);
      expect(wrapper.exists(EuiEmptyPrompt)).toBe(true);
      expect(wrapper.exists(EuiBasicTable)).toBe(false);
    });
  });

  describe('pagination', () => {
    it('derives pagination from meta object', () => {
      mockKea({
        values: {
          apiTokens: [apiToken],
          meta: {
            page: {
              current: 6,
              size: 55,
              total_pages: 1,
              total_results: 1004,
            },
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
      mockKea({
        values: {
          apiTokens: [apiToken],
          meta: {},
        },
      });

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
    let columns: Array<{
      render: (token: object) => any;
    }>;
    const showCredentialsForm = jest.fn();
    const deleteApiKey = jest.fn();

    beforeEach(() => {
      mockKea({
        values: {
          apiTokens: [apiToken],
        },
        actions: {
          showCredentialsForm,
          deleteApiKey,
        },
      });
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
        const wrapper = shallow(column.render(token));
        expect(wrapper.text()).toEqual('some-name');
      });
    });

    describe('column 2 (type)', () => {
      const token = {
        ...apiToken,
        type: PRIVATE,
      };

      it('renders correctly', () => {
        const column = columns[1];
        const wrapper = shallow(column.render(token));
        expect(wrapper.text()).toEqual('Private API Key');
      });
    });

    describe('column 3 (key)', () => {
      const token = {
        ...apiToken,
        key: 'abc-123',
      };

      it('renders an EuiCopy component with the key', () => {
        const column = columns[2];
        const wrapper = shallow(column.render(token));
        expect(wrapper.find(EuiCopy).props().textToCopy).toEqual('abc-123');
      });

      it('renders an EuiCopy component with an empty string if key is not provided', () => {
        const column = columns[2];
        const wrapper = shallow(
          column.render({
            ...token,
            key: undefined,
          })
        );
        expect(wrapper.find(EuiCopy).props().textToCopy).toEqual('');
      });

      it('renders a HiddenText component with the key', () => {
        const column = columns[2];
        const wrapper = shallow(column.render(token)).find(EuiCopy).dive();
        expect(wrapper.find(HiddenText).props().text).toEqual('abc-123');
      });

      it('renders a HiddenText component with an empty string if key is not provided', () => {
        const column = columns[2];
        const wrapper = shallow(
          column.render({
            ...token,
            key: undefined,
          })
        )
          .find(EuiCopy)
          .dive();
        expect(wrapper.find(HiddenText).props().text).toEqual('');
      });

      it('renders a Credential component', () => {
        const column = columns[2];
        const wrapper = shallow(column.render(token)).find(EuiCopy).dive().find(HiddenText).dive();
        expect(wrapper.find(Credential).props()).toEqual({
          copy: expect.any(Function),
          toggleIsHidden: expect.any(Function),
          isHidden: expect.any(Boolean),
          text: '*******',
        });
      });
    });

    describe('column 4 (modes)', () => {
      const token = {
        ...apiToken,
        type: ADMIN,
      };

      it('renders correctly', () => {
        const column = columns[3];
        const wrapper = shallow(column.render(token));
        expect(wrapper.text()).toEqual('--');
      });
    });

    describe('column 5 (engines)', () => {
      const token = {
        ...apiToken,
        type: PRIVATE,
        access_all_engines: true,
      };

      it('renders correctly', () => {
        const column = columns[4];
        const wrapper = shallow(column.render(token));
        expect(wrapper.text()).toEqual('all');
      });
    });

    describe('column 6 (edit)', () => {
      const token = apiToken;
      let wrapper: any;

      beforeEach(() => {
        const column = columns[5];
        wrapper = shallow(column.render(token));
      });

      it('renders a button', () => {
        expect(wrapper.type()).toEqual('button');
      });

      it('calls showCredentialsForm when clicked', () => {
        const onClick = wrapper.props().onClick;
        onClick();
        expect(showCredentialsForm).toHaveBeenCalledWith(token);
      });
    });

    describe('column 7 (delete)', () => {
      const token = {
        ...apiToken,
        name: 'some-name',
      };
      let wrapper: any;

      beforeEach(() => {
        const column = columns[6];
        wrapper = shallow(column.render(token));
      });

      it('renders a button', () => {
        expect(wrapper.type()).toEqual('button');
      });

      it('calls deleteApiKey when clicked', () => {
        const onClick = wrapper.props().onClick;
        onClick();
        expect(deleteApiKey).toHaveBeenCalledWith('some-name');
      });
    });
  });

  describe('onChange', () => {
    it('will handle pagination by calling `fetchCredentials`', () => {
      const fetchCredentials = jest.fn();

      mockKea({
        values: { apiTokens: [apiToken] },
        actions: { fetchCredentials },
      });
      const wrapper = shallow(<CredentialsList />);
      const onChange = wrapper.find(EuiBasicTable).props().onChange;

      onChange({
        page: {
          size: 10,
          index: 2,
        },
      });

      expect(fetchCredentials).toHaveBeenCalledWith(3);
    });
  });
});
