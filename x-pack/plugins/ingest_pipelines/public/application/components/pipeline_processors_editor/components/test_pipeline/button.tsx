/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiButton } from '@elastic/eui';

import { FlyoutProvider } from './flyout_provider';

const i18nTexts = {
  buttonLabel: i18n.translate('xpack.ingestPipelines.pipelineEditor.testPipeline.buttonLabel', {
    defaultMessage: 'Test pipeline',
  }),
};

export const TestPipelineButton: FunctionComponent = () => {
  return (
    <FlyoutProvider>
      {(openFlyout) => {
        return (
          <EuiButton size="s" onClick={openFlyout} data-test-subj="testPipelineButton">
            {i18nTexts.buttonLabel}
          </EuiButton>
        );
      }}
    </FlyoutProvider>
  );
};
