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
import { getMockEqlResponse } from '../../../../common/hooks/eql/eql_search_response.mock';
import { useMatrixHistogram } from '../../../../common/containers/matrix_histogram';
import { useEqlPreview } from '../../../../common/hooks/eql/';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/containers/matrix_histogram');
jest.mock('../../../../common/hooks/eql/');

describe('PreviewQuery', () => {
  beforeEach(() => {
    useKibana().services.notifications.toasts.addError = jest.fn();

    useKibana().services.notifications.toasts.addWarning = jest.fn();

    (useMatrixHistogram as jest.Mock).mockReturnValue([
      false,
      {
        inspect: { dsl: [], response: [] },
        totalCount: 1,
        refetch: jest.fn(),
        data: [],
        buckets: [],
      },
      (useKibana().services.data.search.search as jest.Mock).mockReturnValue(
        of(getMockEqlResponse())
      ),
    ]);

    (useEqlPreview as jest.Mock).mockReturnValue([
      false,
      (useKibana().services.data.search.search as jest.Mock).mockReturnValue(
        of(getMockEqlResponse())
      ),
      {
        inspect: { dsl: [], response: [] },
        totalCount: 1,
        refetch: jest.fn(),
        data: [],
        buckets: [],
      },
    ]);
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

  test('it renders noise warning when rule type is query, timeframe is last hour and hit average is greater than 1/hour', async () => {
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

    (useMatrixHistogram as jest.Mock).mockReturnValue([
      false,
      {
        inspect: { dsl: [], response: [] },
        totalCount: 2,
        refetch: jest.fn(),
        data: [],
        buckets: [],
      },
      (useKibana().services.data.search.search as jest.Mock).mockReturnValue(
        of(getMockEqlResponse())
      ),
    ]);

    wrapper.find('[data-test-subj="queryPreviewButton"] button').at(0).simulate('click');

    expect(wrapper.find('[data-test-subj="previewQueryWarning"]').exists()).toBeTruthy();
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

  test('it renders noise warning when rule type is eql, timeframe is last hour and hit average is greater than 1/hour', async () => {
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

    (useEqlPreview as jest.Mock).mockReturnValue([
      false,
      (useKibana().services.data.search.search as jest.Mock).mockReturnValue(
        of(getMockEqlResponse())
      ),
      {
        inspect: { dsl: [], response: [] },
        totalCount: 2,
        refetch: jest.fn(),
        data: [],
        buckets: [],
      },
    ]);

    wrapper.find('[data-test-subj="queryPreviewButton"] button').at(0).simulate('click');

    expect(wrapper.find('[data-test-subj="previewQueryWarning"]').exists()).toBeTruthy();
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

    (useMatrixHistogram as jest.Mock).mockReturnValue([
      false,
      {
        inspect: { dsl: [], response: [] },
        totalCount: 500,
        refetch: jest.fn(),
        data: [],
        buckets: [{ key: 'siem-kibana', doc_count: 500 }],
      },
      (useKibana().services.data.search.search as jest.Mock).mockReturnValue(
        of(getMockEqlResponse())
      ),
    ]);

    wrapper.find('[data-test-subj="queryPreviewButton"] button').at(0).simulate('click');

    const mockCalls = (useKibana().services.data.search.search as jest.Mock).mock.calls;

    expect(mockCalls.length).toEqual(1);
    expect(wrapper.find('[data-test-subj="previewQueryWarning"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="previewNonEqlQueryHistogram"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="previewThresholdQueryHistogram"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="previewEqlQueryHistogram"]').exists()).toBeFalsy();
  });

  test('it renders noise warning when rule type is threshold, and threshold field is defined, timeframe is last hour and hit average is greater than 1/hour', async () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <TestProviders>
          <PreviewQuery
            ruleType="query"
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

    (useMatrixHistogram as jest.Mock).mockReturnValue([
      false,
      {
        inspect: { dsl: [], response: [] },
        totalCount: 500,
        refetch: jest.fn(),
        data: [],
        buckets: [
          { key: 'siem-kibana', doc_count: 200 },
          { key: 'siem-windows', doc_count: 300 },
        ],
      },
      (useKibana().services.data.search.search as jest.Mock).mockReturnValue(
        of(getMockEqlResponse())
      ),
    ]);

    wrapper.find('[data-test-subj="queryPreviewButton"] button').at(0).simulate('click');

    expect(wrapper.find('[data-test-subj="previewQueryWarning"]').exists()).toBeTruthy();
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

  test('it hides histogram when timeframe changes', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <TestProviders>
          <PreviewQuery
            ruleType="threshold"
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

    expect(wrapper.find('[data-test-subj="previewNonEqlQueryHistogram"]').exists()).toBeTruthy();

    wrapper
      .find('[data-test-subj="queryPreviewTimeframeSelect"] select')
      .at(0)
      .simulate('change', { target: { value: 'd' } });

    expect(wrapper.find('[data-test-subj="previewNonEqlQueryHistogram"]').exists()).toBeFalsy();
  });
});
