/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiText } from '@elastic/eui';
import { pick } from 'lodash/fp';
import { i18n } from '@kbn/i18n';
import { timelineSelectors } from '../../store';
import { timelineDefaults } from '../../store/defaults';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { TimelineStatus } from '../../../../common/api/timeline';

const UNSAVED = i18n.translate('xpack.securitySolution.timeline.saveStatus.unsavedLabel', {
  defaultMessage: 'Unsaved',
});
const UNSAVED_CHANGES = i18n.translate(
  'xpack.securitySolution.timeline.saveStatus.unsavedChangesLabel',
  {
    defaultMessage: 'Unsaved changes',
  }
);

export interface TimelineSaveStatusProps {
  /**
   * Id of the current timeline
   */
  timelineId: string;
}

/**
 * Show the save status of the timeline.
 * If the timeline is saved with no new changes, the component will not render anything.
 * If the timeline hasn't been saved yet or if it is in draft mode, the component will render 'Unsaved'.
 * If the timeline has new changes since last saved, the component will render 'Unsaved changed'.
 */
export const TimelineSaveStatus = React.memo<TimelineSaveStatusProps>(({ timelineId }) => {
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const {
    changed = false,
    status,
    updated,
  } = useDeepEqualSelector((state) =>
    pick(['changed', 'status', 'updated'], getTimeline(state, timelineId) ?? timelineDefaults)
  );

  const isDraft = status === TimelineStatus.draft;

  let statusContent: React.ReactNode;
  if (isDraft || !updated) {
    statusContent = <EuiBadge color="warning">{UNSAVED}</EuiBadge>;
  } else if (changed) {
    statusContent = <EuiBadge color="warning">{UNSAVED_CHANGES}</EuiBadge>;
  }

  if (!statusContent) return null;

  return (
    <EuiText size="xs" data-test-subj="timeline-save-status">
      {statusContent}
    </EuiText>
  );
});

TimelineSaveStatus.displayName = 'TimelineSaveStatus';
