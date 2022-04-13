/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
  EuiCallOut,
} from '@elastic/eui';

import { FormHook } from '../../../../../shared_imports';
import { Document } from '../../types';

import { Tabs, TestPipelineFlyoutTab, OutputTab, DocumentsTab } from './test_pipeline_tabs';
import { TestPipelineFlyoutForm } from './test_pipeline_flyout.container';

export interface Props {
  onClose: () => void;
  handleTestPipeline: (
    testPipelineConfig: TestPipelineConfig,
    refreshOutputPerProcessor?: boolean
  ) => Promise<{ isSuccessful: boolean }>;
  isRunningTest: boolean;
  cachedVerbose?: boolean;
  cachedDocuments?: Document[];
  testOutput?: any;
  form: FormHook<TestPipelineFlyoutForm>;
  validateAndTestPipeline: () => Promise<void>;
  selectedTab: TestPipelineFlyoutTab;
  setSelectedTab: (selectedTa: TestPipelineFlyoutTab) => void;
  testingError: any;
  resetTestOutput: () => void;
}

export interface TestPipelineConfig {
  documents: Document[];
  verbose?: boolean;
}

export const TestPipelineFlyout: React.FunctionComponent<Props> = ({
  handleTestPipeline,
  resetTestOutput,
  isRunningTest,
  cachedVerbose,
  cachedDocuments,
  testOutput,
  form,
  validateAndTestPipeline,
  selectedTab,
  setSelectedTab,
  testingError,
  onClose,
}) => {
  let tabContent;

  if (selectedTab === 'output') {
    tabContent = (
      <OutputTab
        handleTestPipeline={handleTestPipeline}
        isRunningTest={isRunningTest}
        cachedVerbose={cachedVerbose}
        cachedDocuments={cachedDocuments!}
        testOutput={testOutput}
      />
    );
  } else {
    // default to "Documents" tab
    tabContent = (
      <DocumentsTab
        form={form}
        validateAndTestPipeline={validateAndTestPipeline}
        isRunningTest={isRunningTest}
        resetTestOutput={resetTestOutput}
      />
    );
  }

  return (
    <EuiFlyout maxWidth={550} onClose={onClose} data-test-subj="testPipelineFlyout">
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2 data-test-subj="title">
            <FormattedMessage
              id="xpack.ingestPipelines.testPipelineFlyout.title"
              defaultMessage="Test pipeline"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <Tabs
          onTabChange={async (nextTab) => {
            if (nextTab === 'output') {
              // When switching to the output tab,
              // we automatically run the pipeline if documents are defined
              validateAndTestPipeline();
            } else {
              form.reset({ defaultValue: { documents: cachedDocuments! } });
              setSelectedTab(nextTab);
            }
          }}
          selectedTab={selectedTab}
        />

        <EuiSpacer />

        {/* Testing error callout */}
        {testingError ? (
          <>
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.ingestPipelines.testPipelineFlyout.executePipelineError"
                  defaultMessage="Unable to execute pipeline"
                />
              }
              color="danger"
              iconType="alert"
              data-test-subj="pipelineExecutionError"
            >
              <p>{testingError.message}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        ) : null}

        {/* Documents or output tab content */}
        {tabContent}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
