/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { TestPipelineFlyoutTab } from './test_pipeline_tabs';

const i18nTexts = {
  buttonLabel: i18n.translate('xpack.ingestPipelines.pipelineEditor.testPipeline.buttonLabel', {
    defaultMessage: 'Add documents',
  }),
};

interface Props {
  openFlyout: (activeFlyoutTab: TestPipelineFlyoutTab) => void;
}

export const AddDocumentsButton: FunctionComponent<Props> = ({ openFlyout }) => {
  return (
    <EuiButtonEmpty
      size="s"
      onClick={() => openFlyout('documents')}
      data-test-subj="addDocumentsButton"
    >
      {i18nTexts.buttonLabel}
    </EuiButtonEmpty>
  );
};
