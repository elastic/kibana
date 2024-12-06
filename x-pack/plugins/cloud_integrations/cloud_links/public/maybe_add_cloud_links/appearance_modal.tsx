/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC } from 'react';
import {
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
// import { useAppearance } from './use_appearance_hook';

interface Props {
  closeModal: () => void;
  uiSettingsClient: IUiSettingsClient;
}

export const AppearanceModal: FC<Props> = ({ closeModal, uiSettingsClient }) => {
  const modalTitleId = useGeneratedHtmlId();

  // const { isVisible, toggle, isDarkModeOn, colorScheme } = useAppearance({
  //   uiSettingsClient,
  // });

  return (
    <EuiModal aria-labelledby={modalTitleId} onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>Modal title</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        This modal has the following setup:
        <EuiSpacer />
        <p>Content comes here!</p>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton
          onClick={() => {
            // console.log('close');
          }}
          fill
        >
          Close
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
