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

import { Tabs, Tab, OutputTab, DocumentsTab } from './flyout_tabs';

export interface Props {
  children: (openFlyout: () => void) => React.ReactNode;
}

export interface HandleExecuteArgs {
  documents: Document[];
  verbose?: boolean;
  fetchPerProcessorResults?: boolean;
}

export const FlyoutProvider: React.FunctionComponent<Props> = ({ children }) => {
  const {
    state: { processors },
    api,
    toasts,
  } = usePipelineProcessorsContext();

  const { testPipelineData, setCurrentTestPipelineData } = useTestPipelineContext();
  const { results: executeOutput } = testPipelineData;

  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  const [selectedTab, setSelectedTab] = useState<Tab>('documents');

  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executeError, setExecuteError] = useState<any>(null);

  const handleExecute = useCallback(
    async ({ documents, verbose, fetchPerProcessorResults }: HandleExecuteArgs) => {
      const serializedProcessors = serialize(processors.state);

      setIsExecuting(true);
      setExecuteError(null);

      const { error, data: results } = await api.simulatePipeline({
        documents,
        verbose,
        pipeline: { ...serializedProcessors },
      });

      setIsExecuting(false);

      if (error) {
        setExecuteError(error);
        return;
      }

      // TODO handle error case here
      // This currently is only enabled when running the pipeline from the "Documents" tab
      if (fetchPerProcessorResults) {
        const serializedProcessorsWithTag = serialize(processors.state, true);

        // We need to call the simulate API again with verbose enabled so we can cache the per-processor results
        const { data: verboseResults } = await api.simulatePipeline({
          documents,
          verbose: true,
          pipeline: { ...serializedProcessorsWithTag },
        });

        setCurrentTestPipelineData({
          type: 'updateResultsByProcessor',
          payload: {
            config: {
              documents,
              verbose,
            },
            results,
            resultsByProcessor: deserializeVerboseTestOutput(verboseResults),
          },
        });
      } else {
        setCurrentTestPipelineData({
          type: 'updateResults',
          payload: {
            config: {
              documents,
              verbose,
            },
            results,
          },
        });
      }

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
    tabContent = <DocumentsTab isExecuting={isExecuting} handleExecute={handleExecute} />;
  }

  return (
    <>
      {children(() => setIsFlyoutVisible(true))}

      {isFlyoutVisible && (
        <EuiFlyout
          maxWidth={550}
          onClose={() => {
            // reset to initial state
            setIsFlyoutVisible(false);
            setSelectedTab('documents');
            setExecuteError(null);
          }}
          data-test-subj="testPipelineFlyout"
        >
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
              getIsDisabled={(tabId) => !executeOutput && tabId === 'output'}
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
      )}
    </>
  );
};
