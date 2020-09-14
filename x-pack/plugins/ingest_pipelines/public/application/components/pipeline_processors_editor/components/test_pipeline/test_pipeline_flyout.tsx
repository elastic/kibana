/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
  EuiCallOut,
} from '@elastic/eui';

import { useKibana } from '../../../../../shared_imports';
import { useTestPipelineContext } from '../../context';
import { serialize } from '../../serialize';
import { DeserializeResult } from '../../deserialize';
import { Document } from '../../types';

import { Tabs, TestPipelineFlyoutTab, OutputTab, DocumentsTab } from './test_pipeline_flyout_tabs';

export interface Props {
  activeTab: TestPipelineFlyoutTab;
  onClose: () => void;
  processors: DeserializeResult;
}

export interface HandleTestPipelineArgs {
  documents: Document[];
  verbose?: boolean;
}

export const TestPipelineFlyout: React.FunctionComponent<Props> = ({
  onClose,
  activeTab,
  processors,
}) => {
  const { services } = useKibana();

  const {
    testPipelineData,
    setCurrentTestPipelineData,
    updateTestOutputPerProcessor,
  } = useTestPipelineContext();

  const {
    config: { documents: cachedDocuments, verbose: cachedVerbose },
  } = testPipelineData;

  const [selectedTab, setSelectedTab] = useState<TestPipelineFlyoutTab>(activeTab);

  const [shouldTestImmediately, setShouldTestImmediately] = useState<boolean>(false);
  const [isRunningTest, setIsRunningTest] = useState<boolean>(false);
  const [testingError, setTestingError] = useState<any>(null);
  const [testOutput, setTestOutput] = useState<any>(undefined);

  const handleTestPipeline = useCallback(
    async ({ documents, verbose }: HandleTestPipelineArgs) => {
      const serializedProcessors = serialize({ pipeline: processors });

      setIsRunningTest(true);
      setTestingError(null);

      const { error, data: currentTestOutput } = await services.api.simulatePipeline({
        documents,
        verbose,
        pipeline: { ...serializedProcessors },
      });

      setIsRunningTest(false);

      if (error) {
        setTestingError(error);
        return;
      }

      setCurrentTestPipelineData({
        type: 'updateConfig',
        payload: {
          config: {
            documents,
            verbose,
          },
        },
      });

      setTestOutput(currentTestOutput);

      services.notifications.toasts.addSuccess(
        i18n.translate('xpack.ingestPipelines.testPipelineFlyout.successNotificationText', {
          defaultMessage: 'Pipeline executed',
        }),
        {
          toastLifeTimeMs: 1000,
        }
      );

      setSelectedTab('output');
    },
    [services.api, processors, setCurrentTestPipelineData, services.notifications.toasts]
  );

  useEffect(() => {
    if (cachedDocuments) {
      setShouldTestImmediately(true);
    }
    // We only want to know on initial mount if there are cached documents
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // If the user has already tested the pipeline once,
    // use the cached test config and automatically execute the pipeline
    if (shouldTestImmediately) {
      setShouldTestImmediately(false);
      handleTestPipeline({ documents: cachedDocuments!, verbose: cachedVerbose });
    }
  }, [handleTestPipeline, cachedDocuments, cachedVerbose, shouldTestImmediately]);

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
        isRunningTest={isRunningTest}
        handleTestPipeline={handleTestPipeline}
        setPerProcessorOutput={updateTestOutputPerProcessor}
        processors={processors}
        testPipelineData={testPipelineData}
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
          onTabChange={setSelectedTab}
          selectedTab={selectedTab}
          getIsDisabled={(tabId) => !testOutput && tabId === 'output'}
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
