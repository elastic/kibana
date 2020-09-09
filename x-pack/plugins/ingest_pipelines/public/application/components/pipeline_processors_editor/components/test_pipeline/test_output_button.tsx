/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiButton, EuiToolTip } from '@elastic/eui';

const i18nTexts = {
  buttonLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.testPipeline.outputButtonLabel',
    {
      defaultMessage: 'View output',
    }
  ),
  disabledButtonTooltipLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.testPipeline.outputButtonTooltipLabel',
    {
      defaultMessage: 'Add documents to view the output',
    }
  ),
};

interface Props {
  isDisabled: boolean;
  openTestPipelineFlyout: () => void;
}

export const TestOutputButton: FunctionComponent<Props> = ({
  isDisabled,
  openTestPipelineFlyout,
}) => {
  if (isDisabled) {
    return (
      <EuiToolTip position="top" content={<p>{i18nTexts.disabledButtonTooltipLabel}</p>}>
        <EuiButton
          size="s"
          onClick={openTestPipelineFlyout}
          data-test-subj="viewOutputButton"
          iconType="crossInACircleFilled"
          isDisabled={isDisabled}
        >
          {i18nTexts.buttonLabel}
        </EuiButton>
      </EuiToolTip>
    );
  }

  return (
    <EuiButton
      size="s"
      onClick={openTestPipelineFlyout}
      data-test-subj="viewOutputButton"
      iconType="checkInCircleFilled"
    >
      {i18nTexts.buttonLabel}
    </EuiButton>
  );
};
