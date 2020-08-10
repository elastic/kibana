/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useCallback } from 'react';
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

import { Tabs, Tab, OutputTab, DocumentsTab } from './flyout_tabs';

export interface Props {
  children: (openFlyout: () => void) => React.ReactNode;
}

export const FlyoutProvider: React.FunctionComponent<Props> = ({ children }) => {
  const {
    state: { processors },
    api,
    toasts,
  } = usePipelineProcessorsContext();

  const { testPipelineData, setCurrentTestPipelineData } = useTestPipelineContext();
  const {
    config: { documents: cachedDocuments },
    results: executeOutput,
  } = testPipelineData;

  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  const [selectedTab, setSelectedTab] = useState<Tab>('documents');

  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executeError, setExecuteError] = useState<any>(null);

  const handleExecute = useCallback(
    async (
      { documents, verbose }: { documents?: object[]; verbose?: boolean },
      fetchPerProcessorResults?: boolean
    ) => {
      const serializedProcessors = serialize(processors.state);

      setIsExecuting(true);
      setExecuteError(null);

      const { error, data: results } = await api.simulatePipeline({
        documents: documents ?? cachedDocuments,
        verbose,
        pipeline: { ...serializedProcessors },
      });

      setIsExecuting(false);

      if (error) {
        setExecuteError(error);
        return;
      }

      // TODO handle error case here
      if (fetchPerProcessorResults) {
        // TODO does it make sense to call serialization twice?
        const serializedProcessorsWithTag = serialize(processors.state, true);

        // Call the simulate API again with verbose enabled so we can cache the per processor results
        const { data: verboseResults } = await api.simulatePipeline({
          documents: documents ?? cachedDocuments,
          verbose: true,
          pipeline: { ...serializedProcessorsWithTag },
        });

        setCurrentTestPipelineData({
          type: 'updateResultsByProcessor',
          payload: {
            config: {
              documents: documents ?? cachedDocuments,
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
              documents: documents ?? cachedDocuments,
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
    [api, cachedDocuments, processors.state, setCurrentTestPipelineData, toasts]
  );

  let tabContent;

  if (selectedTab === 'output') {
    tabContent = (
      <OutputTab
        executeOutput={executeOutput}
        handleExecute={handleExecute}
        isExecuting={isExecuting}
      />
    );
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
