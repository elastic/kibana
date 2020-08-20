/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent, useState } from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useTestPipelineContext, usePipelineProcessorsContext } from '../../context';

import { DocumentsDropdown } from '../documents_dropdown';
import { TestPipelineFlyoutTab } from './test_pipeline_flyout_tabs';
import { AddDocumentsButton } from './add_documents_button';
import { TestOutputButton } from './test_output_button';
import { TestPipelineFlyout } from './test_pipeline_flyout';

export const TestPipelineActions: FunctionComponent = () => {
  const { testPipelineData, setCurrentTestPipelineData } = useTestPipelineContext();

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
    setCurrentTestPipelineData({
      type: 'updateActiveDocument',
      payload: {
        config: {
          selectedDocumentIndex: index,
        },
      },
    });
  };

  return (
    <>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          {documents ? (
            <DocumentsDropdown
              documents={documents}
              selectedDocumentIndex={selectedDocumentIndex}
              updateSelectedDocument={updateSelectedDocument}
            />
          ) : (
            <AddDocumentsButton
              openTestPipelineFlyout={() => {
                setOpenTestPipelineFlyout(true);
                setActiveFlyoutTab('documents');
              }}
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <TestOutputButton
            isDisabled={Boolean(testOutputPerProcessor) === false}
            openTestPipelineFlyout={() => {
              setOpenTestPipelineFlyout(true);
              setActiveFlyoutTab('output');
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {openTestPipelineFlyout && (
        <TestPipelineFlyout
          activeTab={activeFlyoutTab}
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
