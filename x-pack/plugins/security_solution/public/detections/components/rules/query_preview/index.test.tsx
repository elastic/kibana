/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { of } from 'rxjs';
import { ThemeProvider } from 'styled-components';
import { mount } from 'enzyme';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { TestProviders } from '../../../../common/mock';
import { useKibana } from '../../../../common/lib/kibana';
import { PreviewQuery } from './';
import { getMockResponse } from '../../../../common/hooks/eql/helpers.test';

jest.mock('../../../../common/lib/kibana');

describe('PreviewQuery', () => {
  beforeEach(() => {
    useKibana().services.notifications.toasts.addError = jest.fn();

    useKibana().services.notifications.toasts.addWarning = jest.fn();

    (useKibana().services.data.search.search as jest.Mock).mockReturnValue(of(getMockResponse()));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it renders timeframe select and preview button on render', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <PreviewQuery
          ruleType="query"
          dataTestSubj="queryPreviewSelect"
          idAria="queryPreview"
          query={{ query: { query: 'host.name:*', language: 'kuery' }, filters: [] }}
          index={['foo-*']}
          threshold={undefined}
          isDisabled={false}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="queryPreviewSelect"]').exists()).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="queryPreviewButton"] button').props().disabled
    ).toBeFalsy();
    expect(wrapper.find('[data-test-subj="previewNonEqlQueryHistogram"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="previewThresholdQueryHistogram"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="previewEqlQueryHistogram"]').exists()).toBeFalsy();
  });

  test('it renders preview button disabled if "isDisabled" is true', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <PreviewQuery
          ruleType="query"
          dataTestSubj="queryPreviewSelect"
          idAria="queryPreview"
          query={{ query: { query: 'host.name:*', language: 'kuery' }, filters: [] }}
          index={['foo-*']}
          threshold={undefined}
          isDisabled
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="queryPreviewButton"] button').props().disabled
    ).toBeTruthy();
  });

  test('it renders preview button disabled if "query" is undefined', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <PreviewQuery
          ruleType="query"
          dataTestSubj="queryPreviewSelect"
          idAria="queryPreview"
          query={undefined}
          index={['foo-*']}
          threshold={undefined}
          isDisabled={false}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="queryPreviewButton"] button').props().disabled
    ).toBeTruthy();
  });

  test('it renders query histogram when rule type is query and preview button clicked', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <TestProviders>
          <PreviewQuery
            ruleType="query"
            dataTestSubj="queryPreviewSelect"
            idAria="queryPreview"
            query={{ query: { query: 'host.name:*', language: 'kuery' }, filters: [] }}
            index={['foo-*']}
            threshold={undefined}
            isDisabled={false}
          />
        </TestProviders>
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="queryPreviewButton"] button').at(0).simulate('click');

    const mockCalls = (useKibana().services.data.search.search as jest.Mock).mock.calls;

    expect(mockCalls.length).toEqual(1);
    expect(wrapper.find('[data-test-subj="previewNonEqlQueryHistogram"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="previewThresholdQueryHistogram"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="previewEqlQueryHistogram"]').exists()).toBeFalsy();
  });

  test('it renders query histogram when rule type is saved_query and preview button clicked', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <TestProviders>
          <PreviewQuery
            ruleType="saved_query"
            dataTestSubj="queryPreviewSelect"
            idAria="queryPreview"
            query={{ query: { query: 'host.name:*', language: 'kuery' }, filters: [] }}
            index={['foo-*']}
            threshold={undefined}
            isDisabled={false}
          />
        </TestProviders>
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="queryPreviewButton"] button').at(0).simulate('click');

    const mockCalls = (useKibana().services.data.search.search as jest.Mock).mock.calls;

    expect(mockCalls.length).toEqual(1);
    expect(wrapper.find('[data-test-subj="previewNonEqlQueryHistogram"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="previewThresholdQueryHistogram"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="previewEqlQueryHistogram"]').exists()).toBeFalsy();
  });

  test('it renders eql histogram when preview button clicked and rule type is eql', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <TestProviders>
          <PreviewQuery
            ruleType="eql"
            dataTestSubj="queryPreviewSelect"
            idAria="queryPreview"
            query={{ query: { query: 'file where true', language: 'kuery' }, filters: [] }}
            index={['foo-*']}
            threshold={undefined}
            isDisabled={false}
          />
        </TestProviders>
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="queryPreviewButton"] button').at(0).simulate('click');

    const mockCalls = (useKibana().services.data.search.search as jest.Mock).mock.calls;

    expect(mockCalls.length).toEqual(1);
    expect(wrapper.find('[data-test-subj="previewNonEqlQueryHistogram"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="previewThresholdQueryHistogram"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="previewEqlQueryHistogram"]').exists()).toBeTruthy();
  });

  test('it renders threshold histogram when preview button clicked, rule type is threshold, and threshold field is defined', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <TestProviders>
          <PreviewQuery
            ruleType="threshold"
            dataTestSubj="queryPreviewSelect"
            idAria="queryPreview"
            query={{ query: { query: 'file where true', language: 'kuery' }, filters: [] }}
            index={['foo-*']}
            threshold={{ field: 'agent.hostname', value: 200 }}
            isDisabled={false}
          />
        </TestProviders>
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="queryPreviewButton"] button').at(0).simulate('click');

    const mockCalls = (useKibana().services.data.search.search as jest.Mock).mock.calls;

    expect(mockCalls.length).toEqual(1);
    expect(wrapper.find('[data-test-subj="previewNonEqlQueryHistogram"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="previewThresholdQueryHistogram"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="previewEqlQueryHistogram"]').exists()).toBeFalsy();
  });

  test('it renders query histogram when preview button clicked, rule type is threshold, and threshold field is not defined', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <TestProviders>
          <PreviewQuery
            ruleType="threshold"
            dataTestSubj="queryPreviewSelect"
            idAria="queryPreview"
            query={{ query: { query: 'file where true', language: 'kuery' }, filters: [] }}
            index={['foo-*']}
            threshold={{ field: undefined, value: 200 }}
            isDisabled={false}
          />
        </TestProviders>
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="queryPreviewButton"] button').at(0).simulate('click');

    const mockCalls = (useKibana().services.data.search.search as jest.Mock).mock.calls;

    expect(mockCalls.length).toEqual(1);
    expect(wrapper.find('[data-test-subj="previewNonEqlQueryHistogram"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="previewThresholdQueryHistogram"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="previewEqlQueryHistogram"]').exists()).toBeFalsy();
  });

  test('it renders query histogram when preview button clicked, rule type is threshold, and threshold field is empty string', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <TestProviders>
          <PreviewQuery
            ruleType="threshold"
            dataTestSubj="queryPreviewSelect"
            idAria="queryPreview"
            query={{ query: { query: 'file where true', language: 'kuery' }, filters: [] }}
            index={['foo-*']}
            threshold={{ field: '   ', value: 200 }}
            isDisabled={false}
          />
        </TestProviders>
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="queryPreviewButton"] button').at(0).simulate('click');

    const mockCalls = (useKibana().services.data.search.search as jest.Mock).mock.calls;

    expect(mockCalls.length).toEqual(1);
    expect(wrapper.find('[data-test-subj="previewNonEqlQueryHistogram"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="previewThresholdQueryHistogram"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="previewEqlQueryHistogram"]').exists()).toBeFalsy();
  });
});
