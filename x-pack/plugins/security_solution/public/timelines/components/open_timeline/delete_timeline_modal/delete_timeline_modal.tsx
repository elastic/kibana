/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EUI_MODAL_CONFIRM_BUTTON } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback } from 'react';
import { isEmpty } from 'lodash/fp';

import { useParams } from 'react-router-dom';
import * as i18n from '../translations';
import { TimelineType } from '../../../../../common/types/timeline';

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
  const { tabName } = useParams<{ tabName: TimelineType }>();
  const warning =
    tabName === TimelineType.template
      ? i18n.DELETE_TIMELINE_TEMPLATE_WARNING
      : i18n.DELETE_TIMELINE_WARNING;

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
      <div data-test-subj="warning">{warning}</div>
    </EuiConfirmModal>
  );
});

DeleteTimelineModal.displayName = 'DeleteTimelineModal';
