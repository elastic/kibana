/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiConfirmModal, EUI_MODAL_CONFIRM_BUTTON } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback } from 'react';
import { isEmpty } from 'lodash/fp';

import * as i18n from '../translations';

interface Props {
  title?: string | null;
  onDelete: () => void;
  closeModal: () => void;
}

export const DELETE_TIMELINE_MODAL_WIDTH = 600; // px

/**
 * Renders a modal that confirms deletion of a timeline
 */
export const DeleteTimelineModal = React.memo<Props>(({ title, closeModal, onDelete }) => {
  const getTitle = useCallback(() => {
    const trimmedTitle = title != null ? title.trim() : '';
    const titleResult = !isEmpty(trimmedTitle) ? trimmedTitle : i18n.UNTITLED_TIMELINE;
    return (
      <FormattedMessage
        id="xpack.securitySolution.open.timeline.deleteTimelineModalTitle"
        defaultMessage='Delete "{title}"?'
        data-test-subj="title"
        values={{
          title: titleResult,
        }}
      />
    );
  }, [title]);
  return (
    <EuiConfirmModal
      buttonColor="danger"
      cancelButtonText={i18n.CANCEL}
      confirmButtonText={i18n.DELETE}
      defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
      onCancel={closeModal}
      onConfirm={onDelete}
      title={getTitle()}
    >
      <div data-test-subj="warning">{i18n.DELETE_WARNING}</div>
    </EuiConfirmModal>
  );
});

DeleteTimelineModal.displayName = 'DeleteTimelineModal';
