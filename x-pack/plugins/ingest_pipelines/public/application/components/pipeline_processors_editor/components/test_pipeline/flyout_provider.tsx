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

import { usePipelineProcessorsContext, useTestConfigContext } from '../../context';
import { serialize } from '../../serialize';

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

  const serializedProcessors = serialize(processors.state);

  const { testConfig } = useTestConfigContext();
  const { documents: cachedDocuments, verbose: cachedVerbose } = testConfig;

  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  const initialSelectedTab = cachedDocuments ? 'output' : 'documents';
  const [selectedTab, setSelectedTab] = useState<Tab>(initialSelectedTab);

  const [shouldExecuteImmediately, setShouldExecuteImmediately] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executeError, setExecuteError] = useState<any>(null);
  const [executeOutput, setExecuteOutput] = useState<any>(undefined);

  const handleExecute = useCallback(
    async (documents: object[], verbose?: boolean) => {
      setIsExecuting(true);
      setExecuteError(null);

      const { error, data: output } = await api.simulatePipeline({
        documents,
        verbose,
        pipeline: { ...serializedProcessors },
      });

      setIsExecuting(false);

      if (error) {
        setExecuteError(error);
        return;
      }

      setExecuteOutput(output);

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
    [serializedProcessors, api, toasts]
  );

  useEffect(() => {
    if (isFlyoutVisible === false && cachedDocuments) {
      setShouldExecuteImmediately(true);
    }
  }, [isFlyoutVisible, cachedDocuments]);

  useEffect(() => {
    // If the user has already tested the pipeline once,
    // use the cached test config and automatically execute the pipeline
    if (isFlyoutVisible && shouldExecuteImmediately && cachedDocuments) {
      setShouldExecuteImmediately(false);
      handleExecute(cachedDocuments!, cachedVerbose);
    }
  }, [handleExecute, cachedDocuments, cachedVerbose, isFlyoutVisible, shouldExecuteImmediately]);

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
          onClose={() => setIsFlyoutVisible(false)}
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
