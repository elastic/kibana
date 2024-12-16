/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React from 'react';

import { InferenceForm } from './inference_form';
import * as i18n from './translations';

interface AddInferenceFlyoutWrapperProps {
  setIsAddInferenceFlyoutOpen: (state: boolean) => void;
}

export const AddInferenceFlyoutWrapper: React.FC<AddInferenceFlyoutWrapperProps> = ({
  setIsAddInferenceFlyoutOpen,
}) => {
  const inferenceCreationFlyoutId = useGeneratedHtmlId({
    prefix: 'addInferenceFlyoutId',
  });
  const closeFlyout = () => setIsAddInferenceFlyoutOpen(false);

  return (
    <EuiFlyout
      ownFocus
      onClose={() => setIsAddInferenceFlyoutOpen(false)}
      aria-labelledby={inferenceCreationFlyoutId}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={inferenceCreationFlyoutId}>{i18n.CREATE_ENDPOINT_TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <InferenceForm onSubmitSuccess={setIsAddInferenceFlyoutOpen} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="searchInferenceEndpointsAddInferenceFlyoutWrapperCloseButton"
              onClick={closeFlyout}
              flush="left"
            >
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
