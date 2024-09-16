/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeaderTitle,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { ONBOARDING_VIDEO_SOURCE } from '../../../../../common/constants';
import { useStoredHasVideoVisited } from '../../../../hooks/use_stored_state';
import { useOnboardingContext } from '../../../onboarding_context';
import * as i18n from './translations';

// Not ideal, but we could not find any other way to remove the padding from the modal body
const modalStyles = css`
  .euiModalBody__overflow {
    overflow: hidden;
    padding: 0px;
    mask-image: none;
  }
`;

interface OnboardingHeaderVideoModalProps {
  onClose: () => void;
}

export const OnboardingHeaderVideoModal = React.memo<OnboardingHeaderVideoModalProps>(
  ({ onClose }) => {
    const modalTitle = useGeneratedHtmlId();
    const { spaceId } = useOnboardingContext();
    const [isVideoVisited, setIsVideoVisited] = useStoredHasVideoVisited(spaceId);

    const closeModal = useCallback(() => {
      setIsVideoVisited(true);
      onClose();
    }, [onClose, setIsVideoVisited]);

    return (
      <EuiModal
        data-test-subj="data-ingestion-hub-video-modal"
        aria-labelledby={modalTitle}
        maxWidth={550}
        onClose={closeModal}
        className={modalStyles}
      >
        <EuiModalBody>
          <iframe
            allowFullScreen
            height="309px"
            width="100%"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin"
            src={ONBOARDING_VIDEO_SOURCE}
            title={i18n.ONBOARDING_HEADER_VIDEO_MODAL_VIDEO_TITLE}
          />
        </EuiModalBody>
        <EuiModalFooter>
          <EuiFlexGroup justifyContent="center" direction="column" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiModalHeaderTitle size="s" id={modalTitle}>
                {i18n.ONBOARDING_HEADER_VIDEO_MODAL_TITLE}
              </EuiModalHeaderTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" textAlign="center">
                {i18n.ONBOARDING_HEADER_VIDEO_MODAL_DESCRIPTION}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton data-test-subj="video-modal-button" color="primary" onClick={closeModal}>
                {isVideoVisited
                  ? i18n.ONBOARDING_HEADER_VIDEO_MODAL_BUTTON_CLOSE
                  : i18n.ONBOARDING_HEADER_VIDEO_MODAL_BUTTON}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);
OnboardingHeaderVideoModal.displayName = 'DataIngestionHubVideoModal';
