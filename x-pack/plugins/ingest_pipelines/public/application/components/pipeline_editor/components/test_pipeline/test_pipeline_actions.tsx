/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { usePipelineProcessorsContext } from '../../context';
import { TestPipelineFlyoutTab } from './test_pipeline_tabs';
import { TestPipelineFlyout } from './test_pipeline_flyout.container';

export const TestPipelineActions: FunctionComponent = () => {
  const {
    state: { processors },
  } = usePipelineProcessorsContext();

  const [openTestPipelineFlyout, setOpenTestPipelineFlyout] = useState(false);
  const [activeFlyoutTab, setActiveFlyoutTab] = useState<TestPipelineFlyoutTab>('documents');

  const openFlyout = (activeTab: TestPipelineFlyoutTab) => {
    setOpenTestPipelineFlyout(true);
    setActiveFlyoutTab(activeTab);
  };

  return (
    <>
      <EuiButton
        iconType="play"
        data-test-subj="viewOutputButton"
        onClick={() => openFlyout('documents')}
      >
        <FormattedMessage
          id="xpack.ingestPipelines.pipelineEditor.testPipeline.outputButtonLabel"
          defaultMessage="Test pipeline"
        />
      </EuiButton>

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
