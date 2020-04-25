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

import { useKibana } from '../../../../shared_imports';
import { Pipeline } from '../../../../../common/types';
import { Tabs, Tab, OutputTab, DocumentsTab } from './tabs';
import { useTestConfigContext } from '../test_config_context';

export interface PipelineTestFlyoutProps {
  closeFlyout: () => void;
  pipeline: Pipeline;
  isPipelineValid: boolean;
  shouldTestImmediately: boolean;
}

export const PipelineTestFlyout: React.FunctionComponent<PipelineTestFlyoutProps> = ({
  closeFlyout,
  pipeline,
  isPipelineValid,
  shouldTestImmediately,
}) => {
  const { services } = useKibana();

  const { testConfig } = useTestConfigContext();
  const { documents: cachedDocuments, verbose: cachedVerbose } = testConfig;

  const initialSelectedTab = cachedDocuments ? 'output' : 'documents';
  const [selectedTab, setSelectedTab] = useState<Tab>(initialSelectedTab);

  const [hasNotExecuted, setHasNotExecuted] = useState<boolean>(true);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executeError, setExecuteError] = useState<any>(null);
  const [executeOutput, setExecuteOutput] = useState<any>(undefined);

  const handleExecute = useCallback(
    async (documents: object[], verbose?: boolean) => {
      const { name: pipelineName, ...pipelineDefinition } = pipeline;

      setIsExecuting(true);
      setExecuteError(null);

      const { error, data: output } = await services.api.simulatePipeline({
        documents,
        verbose,
        pipeline: pipelineDefinition,
      });

      setIsExecuting(false);

      if (error) {
        setExecuteError(error);
        return;
      }

      setExecuteOutput(output);

      services.notifications.toasts.addSuccess(
        i18n.translate('xpack.ingestPipelines.testPipelineFlyout.successNotificationText', {
          defaultMessage: 'Pipeline executed',
        })
      );

      setSelectedTab('output');
    },
    [pipeline, services.api, services.notifications.toasts]
  );

  useEffect(() => {
    // If the user has already tested the pipeline once,
    // use the cached test config and automatically execute the pipeline
    if (hasNotExecuted && shouldTestImmediately && Object.entries(pipeline).length > 0) {
      handleExecute(cachedDocuments!, cachedVerbose);
      setHasNotExecuted(false);
    }
  }, [
    pipeline,
    handleExecute,
    cachedDocuments,
    cachedVerbose,
    hasNotExecuted,
    shouldTestImmediately,
  ]);

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
    // default to "documents" tab
    tabContent = (
      <DocumentsTab
        isExecuting={isExecuting}
        isPipelineValid={isPipelineValid}
        handleExecute={handleExecute}
      />
    );
  }

  return (
    <EuiFlyout maxWidth={480} onClose={closeFlyout}>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>
            {pipeline.name ? (
              <FormattedMessage
                id="xpack.ingestPipelines.testPipelineFlyout.withPipelineNameTitle"
                defaultMessage="Test pipeline '{pipelineName}'"
                values={{
                  pipelineName: pipeline.name,
                }}
              />
            ) : (
              <FormattedMessage
                id="xpack.ingestPipelines.testPipelineFlyout.title"
                defaultMessage="Test pipeline"
              />
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <Tabs
          onTabChange={setSelectedTab}
          selectedTab={selectedTab}
          getIsDisabled={tabId => !executeOutput && tabId === 'output'}
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

        {/* Invalid pipeline error */}
        {!isPipelineValid ? (
          <>
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.ingestPipelines.testPipelineFlyout.invalidPipelineErrorMessage"
                  defaultMessage="The pipeline to execute is invalid."
                />
              }
              color="danger"
              iconType="alert"
            />
            <EuiSpacer size="m" />
          </>
        ) : null}

        {/* Documents or output tab content */}
        {tabContent}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
