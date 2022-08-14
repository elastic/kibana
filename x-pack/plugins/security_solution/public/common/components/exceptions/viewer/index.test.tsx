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

jest.mock('../../../lib/kibana');
jest.mock('@kbn/securitysolution-list-hooks');
jest.mock('../use_find_references');

const mockRule = {
  id: 'myfakeruleid',
  author: [],
  severity_mapping: [],
  risk_score_mapping: [],
  rule_id: 'rule-1',
  risk_score: 50,
  description: 'some description',
  from: 'now-5m',
  to: 'now',
  name: 'some-name',
  severity: 'low',
  type: 'query',
  query: 'some query',
  index: ['index-1'],
  interval: '5m',
  references: [],
  actions: [],
  enabled: false,
  false_positives: [],
  max_signals: 100,
  tags: [],
  threat: [],
  throttle: null,
  version: 1,
  exceptions_list: [],
};

describe('ExceptionsViewer', () => {
  const ruleName = 'test rule';

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
          ruleId={'123'}
          ruleIndices={['filebeat-*']}
          ruleName={ruleName}
          exceptionListsMeta={[
            {
              id: '5b543420',
              listId: 'list_id',
              type: 'endpoint',
              namespaceType: 'single',
            },
          ]}
          availableListTypes={[ExceptionListTypeEnum.DETECTION]}
          commentsAccordionId="commentsAccordion"
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="loadingPanelAllRulesTable"]').exists()).toBeTruthy();
  });

  it('it renders empty prompt if no "exceptionListMeta" passed in', () => {
    const wrapper = mount(
      <TestProviders>
        <ExceptionsViewer
          ruleIndices={['filebeat-*']}
          ruleId={'123'}
          ruleName={ruleName}
          exceptionListsMeta={[]}
          availableListTypes={[ExceptionListTypeEnum.DETECTION]}
          commentsAccordionId="commentsAccordion"
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
          ruleIndices={['filebeat-*']}
          ruleId={'123'}
          ruleName={ruleName}
          exceptionListsMeta={[
            {
              id: '5b543420',
              listId: 'list_id',
              type: 'endpoint',
              namespaceType: 'single',
            },
          ]}
          availableListTypes={[ExceptionListTypeEnum.DETECTION]}
          commentsAccordionId="commentsAccordion"
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="exceptionsEmptyPrompt"]').exists()).toBeTruthy();
  });
});
