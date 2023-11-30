/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiTextColor, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedRelative } from '@kbn/i18n-react';
import { pick } from 'lodash/fp';
import { timelineSelectors } from '../../store/timeline';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { timelineDefaults } from '../../store/timeline/defaults';
import * as i18n from '../modal/header/translations';
import { TimelineStatus } from '../../../../common/api/timeline';

export interface TimelineStatusInfoProps {
  /**
   * Id of the timeline to be displayed in the bottom bar and within the portal
   */
  timelineId: string;
}

/**
 * Show the status of the timeline (saved, unsaved, unsaved changes)
 */
export const TimelineStatusInfo = React.memo<TimelineStatusInfoProps>(({ timelineId }) => {
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const {
    changed = false,
    status,
    updated,
  } = useDeepEqualSelector((state) =>
    pick(
      ['changed', 'title', 'status', 'updated'],
      getTimeline(state, timelineId) ?? timelineDefaults
    )
  );

  const isUnsaved = status === TimelineStatus.draft;

  let statusContent: React.ReactNode;
  if (isUnsaved || !updated) {
    statusContent = <EuiTextColor color="warning">{i18n.UNSAVED}</EuiTextColor>;
  } else if (changed) {
    statusContent = <EuiTextColor color="warning">{i18n.UNSAVED_CHANGES}</EuiTextColor>;
  } else {
    statusContent = (
      <>
        {i18n.SAVED}
        <FormattedRelative
          data-test-subj="timeline-status"
          key="timeline-status-autosaved"
          value={new Date(updated)}
        />
      </>
    );
  }
  return (
    <EuiText
      size="xs"
      data-test-subj="timeline-status"
      css={css`
        white-space: nowrap;
      `}
    >
      {statusContent}
    </EuiText>
  );
});

TimelineStatusInfo.displayName = 'TimelineStatusInfo';
