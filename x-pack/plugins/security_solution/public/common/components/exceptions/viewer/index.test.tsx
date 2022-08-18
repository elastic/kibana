/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { ExceptionsViewer } from '.';
import { useKibana } from '../../../lib/kibana';
import { useExceptionListItems, useApi } from '@kbn/securitysolution-list-hooks';

import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { getExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';
import { getFoundExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/found_exception_list_item_schema.mock';
import { TestProviders } from '../../../mock';
import type { Rule } from '../../../../detections/containers/detection_engine/rules/types';
import { mockRule } from '../../../../detections/pages/detection_engine/rules/all/__mocks__/mock';
import { useFindExceptionListReferences } from '../use_find_references';

jest.mock('../../../lib/kibana');
jest.mock('@kbn/securitysolution-list-hooks');
jest.mock('../use_find_references');

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

    (useApi as jest.Mock).mockReturnValue({
      deleteExceptionItem: jest.fn().mockResolvedValue(true),
      getExceptionListsItems: jest.fn().mockResolvedValue(getFoundExceptionListItemSchemaMock()),
    });

    (useExceptionListItems as jest.Mock).mockReturnValue([
      false,
      [],
      [],
      {
        page: 1,
        perPage: 20,
        total: 0,
      },
      jest.fn(),
    ]);

    (useFindExceptionListReferences as jest.Mock).mockReturnValue([false, null]);
  });

  it('it renders loader if "loadingList" is true', () => {
    (useExceptionListItems as jest.Mock).mockReturnValue([
      true,
      [],
      [],
      {
        page: 1,
        perPage: 20,
        total: 0,
      },
      jest.fn(),
    ]);
    const wrapper = mount(
      <TestProviders>
        <ExceptionsViewer
          rule={getMockRule()}
          exceptionListsMeta={[
            {
              id: '5b543420',
              listId: 'list_id',
              type: 'endpoint',
              namespaceType: 'single',
            },
          ]}
          listType={ExceptionListTypeEnum.DETECTION}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="loadingPanelAllRulesTable"]').exists()).toBeTruthy();
  });

  it('it renders empty prompt if no "exceptionListMeta" passed in', () => {
    const wrapper = mount(
      <TestProviders>
        <ExceptionsViewer
          rule={getMockRule()}
          exceptionListsMeta={[]}
          listType={ExceptionListTypeEnum.DETECTION}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="exceptionsEmptyPrompt"]').exists()).toBeTruthy();
  });

  it('it renders empty prompt if no exception items exist', () => {
    (useExceptionListItems as jest.Mock).mockReturnValue([
      false,
      [getExceptionListSchemaMock()],
      [],
      {
        page: 1,
        perPage: 20,
        total: 0,
      },
      jest.fn(),
    ]);

    const wrapper = mount(
      <TestProviders>
        <ExceptionsViewer
          rule={getMockRule()}
          exceptionListsMeta={[
            {
              id: '5b543420',
              listId: 'list_id',
              type: 'endpoint',
              namespaceType: 'single',
            },
          ]}
          listType={ExceptionListTypeEnum.DETECTION}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="exceptionsEmptyPrompt"]').exists()).toBeTruthy();
  });
});
