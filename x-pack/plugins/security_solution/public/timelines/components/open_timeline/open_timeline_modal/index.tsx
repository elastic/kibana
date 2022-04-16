/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiModal } from '@elastic/eui';
import React from 'react';

import { TimelineModel } from '../../../store/timeline/model';

import * as i18n from '../translations';
import { ActionTimelineToShow } from '../types';
import { StatefulOpenTimeline } from '..';

export interface OpenTimelineModalProps {
  onClose: () => void;
  hideActions?: ActionTimelineToShow[];
  modalTitle?: string;
  onOpen?: (timeline: TimelineModel) => void;
}

const DEFAULT_SEARCH_RESULTS_PER_PAGE = 10;
const OPEN_TIMELINE_MODAL_WIDTH = 1100; // px

export const OpenTimelineModal = React.memo<OpenTimelineModalProps>(
  ({ hideActions = [], modalTitle, onClose, onOpen }) => (
    <EuiModal
      data-test-subj="open-timeline-modal"
      maxWidth={OPEN_TIMELINE_MODAL_WIDTH}
      onClose={onClose}
    >
      <StatefulOpenTimeline
        closeModalTimeline={onClose}
        hideActions={hideActions}
        isModal={true}
        defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        onOpenTimeline={onOpen}
        title={modalTitle ?? i18n.OPEN_TIMELINE_TITLE}
      />
    </EuiModal>
  )
);

OpenTimelineModal.displayName = 'OpenTimelineModal';
