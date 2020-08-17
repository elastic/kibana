/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback } from 'react';
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
import { Document } from '../../types';
import { DeserializeResult } from '../../deserialize';

import { Tabs, TestPipelineFlyoutTab, OutputTab, DocumentsTab } from './test_pipeline_flyout_tabs';

export interface Props {
  activeTab: TestPipelineFlyoutTab;
  onClose: () => void;
  processors: DeserializeResult;
}

export interface HandleExecuteArgs {
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
  const { testOutput } = testPipelineData;

  const [selectedTab, setSelectedTab] = useState<TestPipelineFlyoutTab>(activeTab);

  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executeError, setExecuteError] = useState<any>(null);

  const handleExecute = useCallback(
    async ({ documents, verbose }: HandleExecuteArgs) => {
      const serializedProcessors = serialize(processors);

      setIsExecuting(true);
      setExecuteError(null);

      const { error, data: currentTestOutput } = await services.api.simulatePipeline({
        documents,
        verbose,
        pipeline: { ...serializedProcessors },
      });

      setIsExecuting(false);

      if (error) {
        setExecuteError(error);
        return;
      }

      setCurrentTestPipelineData({
        type: 'updateOutput',
        payload: {
          config: {
            documents,
            verbose,
          },
          testOutput: currentTestOutput,
        },
      });

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

  let tabContent;

  if (selectedTab === 'output') {
    tabContent = (
      <OutputTab
        handleExecute={handleExecute}
        isExecuting={isExecuting}
        testPipelineData={testPipelineData}
      />
    );
  } else {
    // default to "Documents" tab
    tabContent = (
      <DocumentsTab
        isExecuting={isExecuting}
        handleExecute={handleExecute}
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

        {/* Execute error callout */}
        {executeError ? (
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
            >
              <p>{executeError.message}</p>
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
