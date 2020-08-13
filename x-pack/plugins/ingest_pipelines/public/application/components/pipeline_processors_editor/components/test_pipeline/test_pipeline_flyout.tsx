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

import { usePipelineProcessorsContext, useTestPipelineContext } from '../../context';
import { serialize } from '../../serialize';
import { deserializeVerboseTestOutput } from '../../deserialize';
import { Document } from '../../types';

import { Tabs, TestPipelineFlyoutTab, OutputTab, DocumentsTab } from './test_pipeline_flyout_tabs';

export interface Props {
  activeTab: TestPipelineFlyoutTab;
  onClose: () => void;
}

export interface HandleExecuteArgs {
  documents: Document[];
  verbose?: boolean;
}

export const TestPipelineFlyout: React.FunctionComponent<Props> = ({ onClose, activeTab }) => {
  const {
    state: { processors },
    api,
    toasts,
  } = usePipelineProcessorsContext();

  const { testPipelineData, setCurrentTestPipelineData } = useTestPipelineContext();
  const { testOutput } = testPipelineData;

  const [selectedTab, setSelectedTab] = useState<TestPipelineFlyoutTab>(activeTab);

  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executeError, setExecuteError] = useState<any>(null);

  const setPerProcessorOutput = async (documents: Document[]) => {
    const serializedProcessorsWithTag = serialize(processors.state, true);

    setCurrentTestPipelineData({
      type: 'updateIsExecuting',
      payload: {
        isExecuting: true,
      },
    });

    const { data: verboseResults, error } = await api.simulatePipeline({
      documents,
      verbose: true,
      pipeline: { ...serializedProcessorsWithTag },
    });

    if (error) {
      setCurrentTestPipelineData({
        type: 'updateIsExecuting',
        payload: {
          isExecuting: false,
        },
      });

      return;
    }

    setCurrentTestPipelineData({
      type: 'updateOutputByProcessor',
      payload: {
        testOutputByProcessor: deserializeVerboseTestOutput(verboseResults),
        isExecuting: false,
      },
    });
  };

  const handleExecute = useCallback(
    async ({ documents, verbose }: HandleExecuteArgs) => {
      const serializedProcessors = serialize(processors.state);

      setIsExecuting(true);
      setExecuteError(null);

      const { error, data: currentTestOutput } = await api.simulatePipeline({
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

      toasts.addSuccess(
        i18n.translate('xpack.ingestPipelines.testPipelineFlyout.successNotificationText', {
          defaultMessage: 'Pipeline executed',
        }),
        {
          toastLifeTimeMs: 1000,
        }
      );

      setSelectedTab('output');
    },
    [api, processors.state, setCurrentTestPipelineData, toasts]
  );

  let tabContent;

  if (selectedTab === 'output') {
    tabContent = <OutputTab handleExecute={handleExecute} isExecuting={isExecuting} />;
  } else {
    // default to "Documents" tab
    tabContent = (
      <DocumentsTab
        isExecuting={isExecuting}
        handleExecute={handleExecute}
        setPerProcessorOutput={setPerProcessorOutput}
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

        {/* Execute error */}
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
