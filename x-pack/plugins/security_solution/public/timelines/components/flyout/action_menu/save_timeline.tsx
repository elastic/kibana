/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import React, { useMemo } from 'react';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useEditTimelineOperation } from '../../timeline/header/edit_timeline_button';
import * as i18n from './translations';

interface SaveTimelineActionProps {
  timelineId: string;
}

export const SaveTimelineAction = ({ timelineId }: SaveTimelineActionProps) => {
  const {
    kibanaSecuritySolutionsPrivileges: { crud: hasKibanaCrud },
  } = useUserPrivileges();

  const { openEditTimeline, editTimelineModal } = useEditTimelineOperation({
    timelineId,
  });

  const button = useMemo(
    () => (
      <EuiButton
        fill
        size="s"
        data-test-subj="save-timeline-action-btn"
        onClick={openEditTimeline}
        iconType="save"
        aria-label={i18n.SAVE_TIMELINE_BTN_LABEL}
        isDisabled={!hasKibanaCrud}
      >
        {i18n.SAVE_TIMELINE_BTN}
      </EuiButton>
    ),
    [hasKibanaCrud, openEditTimeline]
  );

  return (
    <>
      {editTimelineModal}
      {hasKibanaCrud ? (
        button
      ) : (
        <EuiToolTip
          content={i18n.CALL_OUT_UNAUTHORIZED_MSG}
          data-test-subj="save-timeline-btn-tooltip"
        >
          {button}
        </EuiToolTip>
      )}
    </>
  );
};
