/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useState, useEffect } from 'react';
import { EuiButton } from '@elastic/eui';

import { GlobalFlyout } from '../../../../../shared_imports';
import { FlyoutProvider } from './flyout_provider';

const { useGlobalFlyout } = GlobalFlyout;

const i18nTexts = {
  buttonLabel: i18n.translate('xpack.ingestPipelines.pipelineEditor.testPipeline.buttonLabel', {
    defaultMessage: 'Test pipeline',
  }),
};

export const TestPipelineButton: FunctionComponent = () => {
  const {
    addContent: addContentToGlobalFlyout,
    removeContent: removeContentFromGlobalFlyout,
  } = useGlobalFlyout();

  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  useEffect(() => {
    if (isFlyoutVisible) {
      // Open the test pipeline flyout
      addContentToGlobalFlyout({
        id: 'pipelineTest',
        Component: FlyoutProvider,
        flyoutProps: {
          onClose: () => {
            setIsFlyoutVisible(false);
          },
        },
        props: {},
      });
    }
  }, [addContentToGlobalFlyout, isFlyoutVisible]);

  useEffect(() => {
    if (!isFlyoutVisible) {
      removeContentFromGlobalFlyout('pipelineTest');
    }
  }, [removeContentFromGlobalFlyout, isFlyoutVisible]);

  return (
    <EuiButton
      size="s"
      onClick={() => setIsFlyoutVisible(true)}
      data-test-subj="testPipelineButton"
    >
      {i18nTexts.buttonLabel}
    </EuiButton>
  );
};
