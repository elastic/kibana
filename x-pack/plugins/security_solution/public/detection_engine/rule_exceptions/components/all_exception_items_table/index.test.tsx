/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useReducer } from 'react';
import { mount, shallow } from 'enzyme';

import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import { ExceptionsViewer } from '.';
import { useKibana } from '../../../../common/lib/kibana';
import { TestProviders } from '../../../../common/mock';
import type { Rule } from '../../../rule_management/logic/types';
import { mockRule } from '../../../rule_management_ui/components/rules_table/__mocks__/mock';
import { useFindExceptionListReferences } from '../../logic/use_find_references';
import * as i18n from './translations';

jest.mock('../../../../common/lib/kibana');
jest.mock('@kbn/securitysolution-list-hooks');
jest.mock('../../logic/use_find_references');
jest.mock('react', () => {
  const r = jest.requireActual('react');
  return { ...r, useReducer: jest.fn() };
});

const sampleExceptionItem = {
  _version: 'WzEwMjM4MSwxXQ==',
  comments: [],
  created_at: '2022-08-18T17:38:09.018Z',
  created_by: 'elastic',
  description: 'Index - exception list item',
  entries: [
    {
      field: 'Endpoint.policy.applied.artifacts.global.identifiers.name',
      operator: 'included',
      type: 'match',
      value: 'sdf',
      id: '6a62a5fb-a7d7-44bf-942c-a44b69baba63',
    },
  ],
  id: '863f3cb0-1f1c-11ed-8a48-9982ed15e50b',
  item_id: '74eacd42-7617-4d32-9363-3c074a8892fe',
  list_id: '9633e7f2-b92c-4a51-ad56-3e69e5e5f517',
  name: 'Index - exception list item',
  namespace_type: 'single',
  os_types: [],
  tags: [],
  tie_breaker_id: '5ed24b1f-e717-4798-92ac-9eefd33bb9c0',
  type: 'simple',
  updated_at: '2022-08-18T17:38:09.020Z',
  updated_by: 'elastic',
  meta: undefined,
};

const getMockRule = (): Rule => ({
  ...mockRule('123'),
  exceptions_list: [
    {
      id: '5b543420',
      list_id: 'list_id',
      type: 'endpoint',
      namespace_type: 'single',
    },
  ],
});

describe('ExceptionsViewer', () => {
  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        http: {},
        application: {
          getUrlForApp: () => 'some/url',
        },
      },
    });

    (useFindExceptionListReferences as jest.Mock).mockReturnValue([false, null]);
  });

  it('it renders loading screen when "currentState" is "loading"', () => {
    (useReducer as jest.Mock).mockReturnValue([
      {
        exceptions: [],
        pagination: { pageIndex: 0, pageSize: 25, totalItemCount: 0, pageSizeOptions: [25, 50] },
        currenFlyout: null,
        exceptionToEdit: null,
        viewerState: 'loading',
        exceptionLists: [],
      },
      jest.fn(),
    ]);

    const wrapper = mount(
      <TestProviders>
        <ExceptionsViewer
          rule={{
            ...getMockRule(),
            exceptions_list: [
              {
                id: '5b543420',
                list_id: 'list_id',
                type: 'detection',
                namespace_type: 'single',
              },
            ],
          }}
          listType={ExceptionListTypeEnum.DETECTION}
          isViewReadOnly={false}
        />
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionItemViewerEmptyPrompts-loading"]').exists()
    ).toBeTruthy();
  });

  it('it renders empty search screen when "currentState" is "empty_search"', () => {
    (useReducer as jest.Mock).mockReturnValue([
      {
        exceptions: [],
        pagination: { pageIndex: 0, pageSize: 25, totalItemCount: 0, pageSizeOptions: [25, 50] },
        currenFlyout: null,
        exceptionToEdit: null,
        viewerState: 'empty_search',
        exceptionLists: [],
      },
      jest.fn(),
    ]);

    const wrapper = mount(
      <TestProviders>
        <ExceptionsViewer
          rule={{
            ...getMockRule(),
            exceptions_list: [
              {
                id: '5b543420',
                list_id: 'list_id',
                type: 'detection',
                namespace_type: 'single',
              },
            ],
          }}
          listType={ExceptionListTypeEnum.DETECTION}
          isViewReadOnly={false}
        />
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionItemViewerEmptyPrompts-emptySearch"]').exists()
    ).toBeTruthy();
  });

  it('it renders no endpoint items screen when "currentState" is "empty" and "listType" is "endpoint"', () => {
    (useReducer as jest.Mock).mockReturnValue([
      {
        exceptions: [],
        pagination: { pageIndex: 0, pageSize: 25, totalItemCount: 0, pageSizeOptions: [25, 50] },
        currenFlyout: null,
        exceptionToEdit: null,
        viewerState: 'empty',
        exceptionLists: [],
      },
      jest.fn(),
    ]);

    const wrapper = mount(
      <TestProviders>
        <ExceptionsViewer
          rule={{
            ...getMockRule(),
            exceptions_list: [
              {
                id: '5b543420',
                list_id: 'endpoint_list',
                type: 'endpoint',
                namespace_type: 'agnostic',
              },
            ],
          }}
          listType={ExceptionListTypeEnum.ENDPOINT}
          isViewReadOnly={false}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="exceptionsEmptyPromptBody"]').at(0).text()).toEqual(
      i18n.EXCEPTION_EMPTY_ENDPOINT_PROMPT_BODY
    );
    expect(wrapper.find('[data-test-subj="exceptionsEmptyPromptButton"]').at(0).text()).toEqual(
      i18n.EXCEPTION_EMPTY_PROMPT_ENDPOINT_BUTTON
    );
    expect(
      wrapper.find('[data-test-subj="exceptionItemViewerEmptyPrompts-empty-endpoint"]').exists()
    ).toBeTruthy();
  });

  it('it renders no exception items screen when "currentState" is "empty" and "listType" is "detection"', () => {
    (useReducer as jest.Mock).mockReturnValue([
      {
        exceptions: [],
        pagination: { pageIndex: 0, pageSize: 25, totalItemCount: 0, pageSizeOptions: [25, 50] },
        currenFlyout: null,
        exceptionToEdit: null,
        viewerState: 'empty',
        exceptionLists: [],
      },
      jest.fn(),
    ]);

    const wrapper = mount(
      <TestProviders>
        <ExceptionsViewer
          rule={{
            ...getMockRule(),
            exceptions_list: [
              {
                id: '5b543420',
                list_id: 'list_id',
                type: 'detection',
                namespace_type: 'single',
              },
            ],
          }}
          listType={ExceptionListTypeEnum.DETECTION}
          isViewReadOnly={false}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="exceptionsEmptyPromptBody"]').at(0).text()).toEqual(
      i18n.EXCEPTION_EMPTY_PROMPT_BODY
    );
    expect(wrapper.find('[data-test-subj="exceptionsEmptyPromptButton"]').at(0).text()).toEqual(
      i18n.EXCEPTION_EMPTY_PROMPT_BUTTON
    );
    expect(
      wrapper.find('[data-test-subj="exceptionItemViewerEmptyPrompts-empty-detection"]').exists()
    ).toBeTruthy();
  });

  it('it renders add exception flyout if "currentFlyout" is "addException"', () => {
    (useReducer as jest.Mock).mockReturnValue([
      {
        exceptions: [],
        pagination: { pageIndex: 0, pageSize: 25, totalItemCount: 0, pageSizeOptions: [25, 50] },
        currenFlyout: 'addException',
        exceptionToEdit: null,
        viewerState: null,
        exceptionLists: [],
      },
      jest.fn(),
    ]);

    const wrapper = shallow(
      <ExceptionsViewer
        rule={{
          ...getMockRule(),
          exceptions_list: [
            {
              id: '5b543420',
              list_id: 'list_id',
              type: 'detection',
              namespace_type: 'single',
            },
          ],
        }}
        listType={ExceptionListTypeEnum.DETECTION}
        isViewReadOnly={false}
      />
    );

    expect(wrapper.find('[data-test-subj="addExceptionItemFlyout"]').exists()).toBeTruthy();
  });

  it('it renders edit exception flyout if "currentFlyout" is "editException"', () => {
    (useReducer as jest.Mock).mockReturnValue([
      {
        exceptions: [sampleExceptionItem],
        pagination: { pageIndex: 0, pageSize: 25, totalItemCount: 0, pageSizeOptions: [25, 50] },
        currenFlyout: 'editException',
        exceptionToEdit: sampleExceptionItem,
        viewerState: null,
        exceptionLists: [],
      },
      jest.fn(),
    ]);

    const wrapper = shallow(
      <ExceptionsViewer
        rule={{
          ...getMockRule(),
          exceptions_list: [
            {
              id: '5b543420',
              list_id: 'list_id',
              type: 'detection',
              namespace_type: 'single',
            },
          ],
        }}
        listType={ExceptionListTypeEnum.DETECTION}
        isViewReadOnly={false}
      />
    );

    expect(wrapper.find('[data-test-subj="editExceptionItemFlyout"]').exists()).toBeTruthy();
  });
});
