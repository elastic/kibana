/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useQueryTimelineById } from '../../timelines/components/open_timeline/helpers';
import { OPEN_TIMELINE_BUTTON_TEST_ID } from './test_ids';
import type { Note } from '../../../common/api/timeline';

const OPEN_TIMELINE = i18n.translate('xpack.securitySolution.notes.management.openTimelineButton', {
  defaultMessage: 'Open saved timeline',
});

export interface OpenTimelineButtonIconProps {
  /**
   * The note that contains the id of the timeline to open
   */
  note: Note;
  /**
   * The index of the note in the list of notes (used to have unique data-test-subj)
   */
  index?: number;
}

/**
 * Renders a button to open the timeline associated with a note
 */
export const OpenTimelineButtonIcon = memo(({ note, index }: OpenTimelineButtonIconProps) => {
  const unifiedComponentsInTimelineDisabled = useIsExperimentalFeatureEnabled(
    'unifiedComponentsInTimelineDisabled'
  );

  const queryTimelineById = useQueryTimelineById();
  const openTimeline = useCallback(
    ({ timelineId }: { timelineId: string }) =>
      queryTimelineById({
        duplicate: false,
        onOpenTimeline: undefined,
        timelineId,
        timelineType: undefined,
        unifiedComponentsInTimelineDisabled,
      }),
    [queryTimelineById, unifiedComponentsInTimelineDisabled]
  );

  return (
    <EuiButtonIcon
      data-test-subj={`${OPEN_TIMELINE_BUTTON_TEST_ID}-${index}`}
      title={OPEN_TIMELINE}
      aria-label={OPEN_TIMELINE}
      color="text"
      iconType="timelineWithArrow"
      onClick={() => openTimeline(note)}
    />
  );
});

OpenTimelineButtonIcon.displayName = 'OpenTimelineButtonIcon';
