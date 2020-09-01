/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';

const i18nTexts = {
  buttonLabel: i18n.translate('xpack.ingestPipelines.pipelineEditor.testPipeline.buttonLabel', {
    defaultMessage: 'Add documents',
  }),
};

interface Props {
  openTestPipelineFlyout: () => void;
}

export const AddDocumentsButton: FunctionComponent<Props> = ({ openTestPipelineFlyout }) => {
  return (
    <EuiButtonEmpty
      size="s"
      onClick={openTestPipelineFlyout}
      data-test-subj="addDocumentsButton"
      iconType="plusInCircleFilled"
    >
      {i18nTexts.buttonLabel}
    </EuiButtonEmpty>
  );
};
