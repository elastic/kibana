/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiModal, EuiOverlayMask } from '@elastic/eui';
import React, { useCallback } from 'react';
import { createGlobalStyle } from 'styled-components';

import { DeleteTimelineModal, DELETE_TIMELINE_MODAL_WIDTH } from './delete_timeline_modal';
import { DeleteTimelines } from '../types';
const RemovePopover = createGlobalStyle`
div.euiPopover__panel-isOpen {
  display: none;
}
`;

interface Props {
  deleteTimelines: DeleteTimelines;
  onComplete?: () => void;
  isModalOpen: boolean;
  savedObjectIds: string[];
  title: string | null;
}
/**
 * Renders a button that when clicked, displays the `Delete Timeline` modal
 */
export const DeleteTimelineModalOverlay = React.memo<Props>(
  ({ deleteTimelines, isModalOpen, savedObjectIds, title, onComplete }) => {
    const internalCloseModal = useCallback(() => {
      if (onComplete != null) {
        onComplete();
      }
    }, [onComplete]);
    const onDelete = useCallback(() => {
      if (savedObjectIds != null) {
        deleteTimelines(savedObjectIds);
      }
      if (onComplete != null) {
        onComplete();
      }
    }, [deleteTimelines, savedObjectIds, onComplete]);
    return (
      <>
        {isModalOpen && <RemovePopover data-test-subj="remove-popover" />}
        {isModalOpen ? (
          <EuiOverlayMask>
            <EuiModal maxWidth={DELETE_TIMELINE_MODAL_WIDTH} onClose={internalCloseModal}>
              <DeleteTimelineModal
                data-test-subj="delete-timeline-modal"
                onDelete={onDelete}
                title={title}
                closeModal={internalCloseModal}
              />
            </EuiModal>
          </EuiOverlayMask>
        ) : null}
      </>
    );
  }
);
DeleteTimelineModalOverlay.displayName = 'DeleteTimelineModalOverlay';
