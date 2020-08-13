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
  openFlyout: () => void;
}

export const AddDocumentsButton: FunctionComponent<Props> = ({ openFlyout }) => {
  return (
    <EuiButtonEmpty
      size="s"
      onClick={openFlyout}
      data-test-subj="addDocumentsButton"
      iconType="plusInCircleFilled"
    >
      {i18nTexts.buttonLabel}
    </EuiButtonEmpty>
  );
};
