/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { DataIngestionHubVideo } from '../../../card_step/content/data_ingestion_hub_video';
import {
  DATA_INGESTION_HUB_VIDEO_MODAL_BUTTON,
  DATA_INGESTION_HUB_VIDEO_MODAL_BUTTON_CLOSE,
  DATA_INGESTION_HUB_VIDEO_MODAL_DESCRIPTION,
  DATA_INGESTION_HUB_VIDEO_MODAL_TITLE,
} from '../../translations';
import { useDataIngestionHubHeaderVideoModalStyles } from './video_modal.styles';

interface DataIngestionHubVideoModalComponentProps {
  onCloseModal: () => void;
  isOnboardingHubVisited?: boolean | null;
}

export const DataIngestionHubVideoModal: React.FC<DataIngestionHubVideoModalComponentProps> =
  React.memo(({ onCloseModal, isOnboardingHubVisited }) => {
    const modalTitle = useGeneratedHtmlId();
    const {
      modalStyles,
      modalFooterStyles,
      modalBodyStyles,
      modalTitleStyles,
      modalDescriptionStyles,
    } = useDataIngestionHubHeaderVideoModalStyles();

    return (
      <EuiModal
        data-test-subj="data-ingestion-hub-video-modal"
        aria-labelledby={modalTitle}
        className={modalStyles}
        onClose={onCloseModal}
      >
        <EuiModalBody className={modalBodyStyles}>
          <DataIngestionHubVideo />
        </EuiModalBody>
        <EuiModalFooter className={modalFooterStyles}>
          <EuiFlexGroup wrap={true} justifyContent="center">
            <EuiFlexItem grow={false} justifyContent="center">
              <EuiModalHeaderTitle className={modalTitleStyles} id={modalTitle}>
                {DATA_INGESTION_HUB_VIDEO_MODAL_TITLE}
              </EuiModalHeaderTitle>
              <EuiSpacer size="m" />
              <EuiText size="s" className={modalDescriptionStyles}>
                {DATA_INGESTION_HUB_VIDEO_MODAL_DESCRIPTION}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton data-test-subj="video-modal-button" color="primary" onClick={onCloseModal}>
                {isOnboardingHubVisited
                  ? DATA_INGESTION_HUB_VIDEO_MODAL_BUTTON_CLOSE
                  : DATA_INGESTION_HUB_VIDEO_MODAL_BUTTON}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalFooter>
      </EuiModal>
    );
  });

DataIngestionHubVideoModal.displayName = 'DataIngestionHubVideoModal';
