/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import { useTestPipelineContext, usePipelineProcessorsContext } from '../../context';
import { DocumentsDropdown } from './documents_dropdown';
import { TestPipelineFlyoutTab } from './test_pipeline_tabs';
import { AddDocumentsButton } from './add_documents_button';
import { TestOutputButton } from './test_output_button';
import { TestPipelineFlyout } from './test_pipeline_flyout.container';

const i18nTexts = {
  testPipelineActionsLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.testPipeline.testPipelineActionsLabel',
    {
      defaultMessage: 'Test pipeline:',
    }
  ),
};

export const TestPipelineActions: FunctionComponent = () => {
  const { testPipelineData, testPipelineDataDispatch } = useTestPipelineContext();

  const {
    state: { processors },
  } = usePipelineProcessorsContext();

  const {
    testOutputPerProcessor,
    config: { documents, selectedDocumentIndex },
  } = testPipelineData;

  const [openTestPipelineFlyout, setOpenTestPipelineFlyout] = useState(false);
  const [activeFlyoutTab, setActiveFlyoutTab] = useState<TestPipelineFlyoutTab>('documents');

  const updateSelectedDocument = (index: number) => {
    testPipelineDataDispatch({
      type: 'updateActiveDocument',
      payload: {
        config: {
          selectedDocumentIndex: index,
        },
      },
    });
  };

  const openFlyout = (activeTab: TestPipelineFlyoutTab) => {
    setOpenTestPipelineFlyout(true);
    setActiveFlyoutTab(activeTab);
  };

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="baseline">
        <EuiFlexItem grow={false}>
          <EuiText>
            <span>
              <strong>{i18nTexts.testPipelineActionsLabel}</strong>
            </span>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          {documents ? (
            <DocumentsDropdown
              documents={documents}
              selectedDocumentIndex={selectedDocumentIndex}
              updateSelectedDocument={updateSelectedDocument}
              openFlyout={openFlyout}
            />
          ) : (
            <AddDocumentsButton openFlyout={openFlyout} />
          )}
        </EuiFlexItem>

        {testOutputPerProcessor && (
          <EuiFlexItem grow={false}>
            <TestOutputButton openFlyout={openFlyout} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {openTestPipelineFlyout && (
        <TestPipelineFlyout
          activeTab={activeFlyoutTab}
          setActiveTab={setActiveFlyoutTab}
          processors={{
            processors: processors.state.processors,
            onFailure: processors.state.onFailure,
          }}
          onClose={() => setOpenTestPipelineFlyout(false)}
        />
      )}
    </>
  );
};
