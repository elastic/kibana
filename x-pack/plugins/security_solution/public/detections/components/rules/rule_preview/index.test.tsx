/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import type { DataViewBase } from '@kbn/es-query';
import { fields } from '@kbn/data-plugin/common/mocks';

import { TestProviders } from '../../../../common/mock';
import type { RulePreviewProps } from '.';
import { RulePreview, REASONABLE_INVOCATION_COUNT } from '.';
import { usePreviewRoute } from './use_preview_route';
import { usePreviewHistogram } from './use_preview_histogram';
import { DataSourceType } from '../../../pages/detection_engine/rules/types';
import {
  getStepScheduleDefaultValue,
  stepAboutDefaultValue,
  stepDefineDefaultValue,
} from '../../../pages/detection_engine/rules/utils';
import { usePreviewInvocationCount } from './use_preview_invocation_count';

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
jest.mock('./use_preview_invocation_count');

const getMockIndexPattern = (): DataViewBase => ({
  fields,
  id: '1234',
  title: 'logstash-*',
});

const defaultProps: RulePreviewProps = {
  defineRuleData: {
    ...stepDefineDefaultValue,
    ruleType: 'threat_match',
    index: ['test-*'],
    indexPattern: getMockIndexPattern(),
    dataSourceType: DataSourceType.IndexPatterns,
    threatIndex: ['threat-*'],
    threatMapping: [
      {
        entries: [
          { field: 'file.hash.md5', value: 'threat.indicator.file.hash.md5', type: 'mapping' },
        ],
      },
    ],
    queryBar: {
      filters: [],
      query: { query: 'file.hash.md5:*', language: 'kuery' },
      saved_id: null,
    },
    threatQueryBar: {
      filters: [],
      query: { query: 'threat.indicator.file.hash.md5:*', language: 'kuery' },
      saved_id: null,
    },
    threshold: {
      field: ['agent.hostname'],
      value: '200',
      cardinality: {
        field: ['user.name'],
        value: '2',
      },
    },
    anomalyThreshold: 50,
    machineLearningJobId: ['test-ml-job-id'],
    eqlOptions: {},
    newTermsFields: ['host.ip'],
    historyWindowSize: '7d',
  },
  aboutRuleData: stepAboutDefaultValue,
  scheduleRuleData: getStepScheduleDefaultValue('threat_match'),
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
      hasNoiseWarning: false,
      addNoiseWarning: jest.fn(),
      createPreview: jest.fn(),
      clearPreview: jest.fn(),
      logs: [],
      isPreviewRequestInProgress: false,
      previewId: undefined,
    });

    (usePreviewInvocationCount as jest.Mock).mockReturnValue({ invocationCount: 500 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it renders timeframe select and preview button on render', async () => {
    const wrapper = render(
      <TestProviders>
        <RulePreview {...defaultProps} />
      </TestProviders>
    );

    expect(await wrapper.findByTestId('rule-preview')).toBeTruthy();
    expect(await wrapper.findByTestId('preview-time-frame')).toBeTruthy();
  });

  test('does not render histogram when there is no previewId', async () => {
    const wrapper = render(
      <TestProviders>
        <RulePreview {...defaultProps} />
      </TestProviders>
    );

    expect(await wrapper.queryByTestId('[data-test-subj="preview-histogram-panel"]')).toBeNull();
  });

  test('it renders invocation count warning when invocation count is bigger then "REASONABLE_INVOCATION_COUNT"', async () => {
    (usePreviewInvocationCount as jest.Mock).mockReturnValue({
      invocationCount: REASONABLE_INVOCATION_COUNT + 1,
    });

    const wrapper = render(
      <TestProviders>
        <RulePreview {...defaultProps} />
      </TestProviders>
    );

    expect(await wrapper.findByTestId('previewInvocationCountWarning')).toBeTruthy();
  });
});
