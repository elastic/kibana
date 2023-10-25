/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React, { useState, useCallback } from 'react';
import { OpenTimelineModal } from '../../open_timeline/open_timeline_modal';
import type { ActionTimelineToShow } from '../../open_timeline/types';

export interface OpenTimelineModalButtonProps {}

const actionTimelineToHide: ActionTimelineToShow[] = ['createFrom'];

export const OpenTimelineAction = React.memo<OpenTimelineModalButtonProps>(() => {
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const onCloseTimelineModal = useCallback(() => setShowTimelineModal(false), []);
  const onOpenTimelineModal = useCallback(() => {
    setShowTimelineModal(true);
  }, []);

  return (
    <>
      <EuiButtonEmpty data-test-subj="open-timeline-button" onClick={onOpenTimelineModal}>
        {'Open'}
      </EuiButtonEmpty>

      {showTimelineModal ? (
        <OpenTimelineModal onClose={onCloseTimelineModal} hideActions={actionTimelineToHide} />
      ) : null}
    </>
  );
});

OpenTimelineAction.displayName = 'OpenTimelineModalButton';
