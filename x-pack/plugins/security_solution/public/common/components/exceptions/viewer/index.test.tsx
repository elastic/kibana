/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { ThemeProvider } from 'styled-components';

import { ExceptionsViewer } from '.';
import { useKibana } from '../../../lib/kibana';
import { useExceptionListItems, useApi } from '@kbn/securitysolution-list-hooks';

import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { getExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';
import { getFoundExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/found_exception_list_item_schema.mock';
import { getMockTheme } from '../../../lib/kibana/kibana_react.mock';

const mockTheme = getMockTheme({
  eui: {
    euiColorEmptyShade: '#ece',
    euiBreakpoints: {
      l: '1200px',
    },
    paddingSizes: {
      m: '10px',
    },
  },
});

jest.mock('../../../lib/kibana');
jest.mock('@kbn/securitysolution-list-hooks');

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
      <ThemeProvider theme={mockTheme}>
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
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="loadingPanelAllRulesTable"]').exists()).toBeTruthy();
  });

  it('it renders empty prompt if no "exceptionListMeta" passed in', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <ExceptionsViewer
          ruleIndices={['filebeat-*']}
          ruleId={'123'}
          ruleName={ruleName}
          exceptionListsMeta={[]}
          availableListTypes={[ExceptionListTypeEnum.DETECTION]}
          commentsAccordionId="commentsAccordion"
        />
      </ThemeProvider>
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
      <ThemeProvider theme={mockTheme}>
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
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="exceptionsEmptyPrompt"]').exists()).toBeTruthy();
  });
});
