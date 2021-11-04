/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { TestProviders } from '../../../../common/mock';
import { RulePreview, RulePreviewProps } from './';
import { usePreviewRoute } from './use_preview_route';
import { usePreviewHistogram } from './use_preview_histogram';

jest.mock('../../../../common/lib/kibana');
jest.mock('./use_preview_route');
jest.mock('./use_preview_histogram');
jest.mock('../../../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn().mockReturnValue({
    from: '2020-07-07T08:20:18.966Z',
    isInitializing: false,
    to: '2020-07-08T08:20:18.966Z',
    setQuery: jest.fn(),
  }),
}));

const defaultProps: RulePreviewProps = {
  ruleType: 'threat_match',
  index: ['test-*'],
  threatIndex: ['threat-*'],
  threatMapping: [
    {
      entries: [
        { field: 'file.hash.md5', value: 'threat.indicator.file.hash.md5', type: 'mapping' },
      ],
    },
  ],
  isDisabled: false,
  query: {
    filters: [],
    query: { query: 'file.hash.md5:*', language: 'kuery' },
  },
  threatQuery: {
    filters: [],
    query: { query: 'threat.indicator.file.hash.md5:*', language: 'kuery' },
  },
  threshold: {
    field: ['agent.hostname'],
    value: '200',
    cardinality: {
      field: ['user.name'],
      value: '2',
    },
  },
};

describe('PreviewQuery', () => {
  beforeEach(() => {
    (usePreviewHistogram as jest.Mock).mockReturnValue([
      false,
      {
        inspect: { dsl: [], response: [] },
        totalCount: 1,
        refetch: jest.fn(),
        data: [],
        buckets: [],
      },
    ]);

    (usePreviewRoute as jest.Mock).mockReturnValue({
      addNoiseWarning: jest.fn(),
      createPreview: jest.fn(),
      clearPreview: jest.fn(),
      errors: [],
      isPreviewRequestInProgress: false,
      previewId: undefined,
      warnings: [],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it renders timeframe select and preview button on render', () => {
    const wrapper = mount(
      <TestProviders>
        <RulePreview {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="rule-preview"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="preview-time-frame"]').exists()).toBeTruthy();
  });

  test('it renders preview button disabled if "isDisabled" is true', () => {
    const wrapper = mount(
      <TestProviders>
        <RulePreview {...defaultProps} isDisabled={true} />
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="queryPreviewButton"] button').props().disabled
    ).toBeTruthy();
  });

  test('it renders preview button enabled if "isDisabled" is false', () => {
    const wrapper = mount(
      <TestProviders>
        <RulePreview {...defaultProps} />
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="queryPreviewButton"] button').props().disabled
    ).toBeFalsy();
  });

  test('does not render histogram when there is no previewId', () => {
    const wrapper = mount(
      <TestProviders>
        <RulePreview {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="preview-histogram-panel"]').exists()).toBeFalsy();
  });
});
