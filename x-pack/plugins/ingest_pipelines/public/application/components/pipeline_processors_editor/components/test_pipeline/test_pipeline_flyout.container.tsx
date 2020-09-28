/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';

import { useKibana, useForm } from '../../../../../shared_imports';
import { useTestPipelineContext } from '../../context';
import { serialize } from '../../serialize';
import { DeserializeResult } from '../../deserialize';
import { Document } from '../../types';
import { TestPipelineFlyout as ViewComponent } from './test_pipeline_flyout';

import { TestPipelineFlyoutTab } from './test_pipeline_flyout_tabs';
import { documentsSchema } from './test_pipeline_flyout_tabs/documents_schema';

export interface Props {
  activeTab: TestPipelineFlyoutTab;
  onClose: () => void;
  processors: DeserializeResult;
}

export interface TestPipelineConfig {
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

  const { form } = useForm({
    schema: documentsSchema,
    defaultValue: {
      documents: cachedDocuments || '',
    },
  });

  const [selectedTab, setSelectedTab] = useState<TestPipelineFlyoutTab>(activeTab);

  const [isRunningTest, setIsRunningTest] = useState<boolean>(false);
  const [testingError, setTestingError] = useState<any>(null);
  const [testOutput, setTestOutput] = useState<any>(undefined);

  const handleTestPipeline = useCallback(
    async (
      { documents, verbose }: TestPipelineConfig,
      updateProcessorOutput?: boolean
    ): Promise<{ isSuccessful: boolean }> => {
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

        // reset the per-processor output
        // this is needed in the scenario where the pipeline has already executed,
        // but you modified the sample documents and there was an error on re-execution
        setCurrentTestPipelineData({
          type: 'updateOutputPerProcessor',
          payload: {
            isExecutingPipeline: false,
            testOutputPerProcessor: undefined,
          },
        });

        return { isSuccessful: false };
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

      // We sometimes need to manually refresh the per-processor output
      // e.g., when clicking the "Refresh output" button and there have been no state changes
      if (updateProcessorOutput) {
        updateTestOutputPerProcessor(documents, processors);
      }

      setTestOutput(currentTestOutput);

      services.notifications.toasts.addSuccess(
        i18n.translate('xpack.ingestPipelines.testPipelineFlyout.successNotificationText', {
          defaultMessage: 'Pipeline executed',
        }),
        {
          toastLifeTimeMs: 1000,
        }
      );

      return { isSuccessful: true };
    },
    [
      processors,
      services.api,
      services.notifications.toasts,
      setCurrentTestPipelineData,
      updateTestOutputPerProcessor,
    ]
  );

  const validateAndTestPipeline = async () => {
    const { isValid, data } = await form.submit();

    if (!isValid) {
      return;
    }

    const { documents } = data as { documents: Document[] };

    const { isSuccessful } = await handleTestPipeline({
      documents: documents!,
      verbose: cachedVerbose,
    });

    if (isSuccessful) {
      setSelectedTab('output');
    }
  };

  useEffect(() => {
    if (cachedDocuments && activeTab === 'output') {
      handleTestPipeline({ documents: cachedDocuments, verbose: cachedVerbose }, true);
    }
    // We only want to know on initial mount if
    // there are cached documents and we are on the output tab
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ViewComponent
      handleTestPipeline={handleTestPipeline}
      isRunningTest={isRunningTest}
      cachedVerbose={cachedVerbose}
      cachedDocuments={cachedDocuments}
      testOutput={testOutput}
      form={form}
      validateAndTestPipeline={validateAndTestPipeline}
      selectedTab={selectedTab}
      setSelectedTab={setSelectedTab}
      testingError={testingError}
      onClose={onClose}
    />
  );
};
