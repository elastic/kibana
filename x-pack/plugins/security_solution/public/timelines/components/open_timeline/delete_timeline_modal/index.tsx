/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiModal } from '@elastic/eui';
import React, { useCallback } from 'react';
import { createGlobalStyle } from 'styled-components';

import { useParams } from 'react-router-dom';
import { DeleteTimelineModal, DELETE_TIMELINE_MODAL_WIDTH } from './delete_timeline_modal';
import type { DeleteTimelines } from '../types';
import { TimelineType } from '../../../../../common/api/timeline';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import * as i18n from '../translations';

const RemovePopover = createGlobalStyle`
div[data-popover-open] {
  display: none;
}
`;

interface Props {
  deleteTimelines: DeleteTimelines;
  onComplete?: () => void;
  isModalOpen: boolean;
  savedObjectIds: string[];
  savedSearchIds?: string[];
  title: string | null;
}
/**
 * Renders a button that when clicked, displays the `Delete Timeline` modal
 */
export const DeleteTimelineModalOverlay = React.memo<Props>(
  ({ deleteTimelines, isModalOpen, savedObjectIds, title, onComplete, savedSearchIds }) => {
    const { addSuccess } = useAppToasts();
    const { tabName: timelineType } = useParams<{ tabName: TimelineType }>();

    const internalCloseModal = useCallback(() => {
      if (onComplete != null) {
        onComplete();
      }
    }, [onComplete]);
    const onDelete = useCallback(() => {
      if (savedObjectIds.length > 0 && savedSearchIds != null && savedSearchIds.length > 0) {
        deleteTimelines(savedObjectIds, savedSearchIds);
        addSuccess({
          title:
            timelineType === TimelineType.template
              ? i18n.SUCCESSFULLY_DELETED_TIMELINE_TEMPLATES(savedObjectIds.length)
              : i18n.SUCCESSFULLY_DELETED_TIMELINES(savedObjectIds.length),
        });
      } else if (savedObjectIds.length > 0) {
        deleteTimelines(savedObjectIds);
        addSuccess({
          title:
            timelineType === TimelineType.template
              ? i18n.SUCCESSFULLY_DELETED_TIMELINE_TEMPLATES(savedObjectIds.length)
              : i18n.SUCCESSFULLY_DELETED_TIMELINES(savedObjectIds.length),
        });
      }

      if (onComplete != null) {
        onComplete();
      }
    }, [deleteTimelines, savedObjectIds, onComplete, addSuccess, timelineType, savedSearchIds]);
    return (
      <>
        {isModalOpen && <RemovePopover data-test-subj="remove-popover" />}
        {isModalOpen ? (
          <EuiModal maxWidth={DELETE_TIMELINE_MODAL_WIDTH} onClose={internalCloseModal}>
            <DeleteTimelineModal
              data-test-subj="delete-timeline-modal"
              onDelete={onDelete}
              title={title}
              closeModal={internalCloseModal}
            />
          </EuiModal>
        ) : null}
      </>
    );
  }
);
DeleteTimelineModalOverlay.displayName = 'DeleteTimelineModalOverlay';
