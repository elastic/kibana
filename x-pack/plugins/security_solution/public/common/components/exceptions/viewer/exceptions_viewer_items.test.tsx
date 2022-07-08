/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount } from 'enzyme';

import * as i18n from '../translations';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { ExceptionsViewerItems } from './exceptions_viewer_items';
import { getMockTheme } from '../../../lib/kibana/kibana_react.mock';
import { TestProviders } from '../../../mock';

const mockTheme = getMockTheme({
  eui: {
    euiSize: '10px',
    euiColorPrimary: '#ece',
    euiColorDanger: '#ece',
  },
});

describe('ExceptionsViewerItems', () => {
  it('it renders empty prompt if "showEmpty" is "true"', () => {
    const wrapper = mount(
      <TestProviders>
        <ExceptionsViewerItems
          showEmpty
          showNoResults={false}
          isInitLoading={false}
          disableActions={false}
          exceptions={[]}
          loadingItemIds={[]}
          onDeleteException={jest.fn()}
          onEditExceptionItem={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="exceptionsEmptyPrompt"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="exceptionsContainer"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="exceptionsEmptyPromptTitle"]').last().text()).toEqual(
      i18n.EXCEPTION_EMPTY_PROMPT_TITLE
    );
    expect(wrapper.find('[data-test-subj="exceptionsEmptyPromptBody"]').text()).toEqual(
      i18n.EXCEPTION_EMPTY_PROMPT_BODY
    );
  });

  it('it renders no search results found prompt if "showNoResults" is "true"', () => {
    const wrapper = mount(
      <TestProviders>
        <ThemeProvider theme={mockTheme}>
          <ExceptionsViewerItems
            showEmpty={false}
            showNoResults
            isInitLoading={false}
            disableActions={false}
            exceptions={[]}
            loadingItemIds={[]}
            onDeleteException={jest.fn()}
            onEditExceptionItem={jest.fn()}
          />
        </ThemeProvider>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="exceptionsEmptyPrompt"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="exceptionsContainer"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="exceptionsEmptyPromptTitle"]').last().text()).toEqual('');
    expect(wrapper.find('[data-test-subj="exceptionsEmptyPromptBody"]').text()).toEqual(
      i18n.EXCEPTION_NO_SEARCH_RESULTS_PROMPT_BODY
    );
  });

  it('it renders exceptions if "showEmpty" and "isInitLoading" is "false", and exceptions exist', () => {
    const wrapper = mount(
      <TestProviders>
        <ThemeProvider theme={mockTheme}>
          <ExceptionsViewerItems
            showEmpty={false}
            showNoResults={false}
            isInitLoading={false}
            disableActions={false}
            exceptions={[getExceptionListItemSchemaMock()]}
            loadingItemIds={[]}
            onDeleteException={jest.fn()}
            onEditExceptionItem={jest.fn()}
          />
        </ThemeProvider>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="exceptionsContainer"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="exceptionsEmptyPrompt"]').exists()).toBeFalsy();
  });

  it('it does not render exceptions if "isInitLoading" is "true"', () => {
    const wrapper = mount(
      <TestProviders>
        <ThemeProvider theme={mockTheme}>
          <ExceptionsViewerItems
            showEmpty={false}
            showNoResults={false}
            isInitLoading={true}
            disableActions={false}
            exceptions={[]}
            loadingItemIds={[]}
            onDeleteException={jest.fn()}
            onEditExceptionItem={jest.fn()}
          />
        </ThemeProvider>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="exceptionsContainer"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="exceptionsEmptyPrompt"]').exists()).toBeTruthy();
  });
});
