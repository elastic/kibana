/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTextColor, EuiText } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';

import { TimelineStatus } from '../../../../../common/api/timeline';
import * as i18n from './translations';

export const TimelineStatusInfoComponent = React.memo<{
  status: TimelineStatus;
  updated?: number;
  changed?: boolean;
}>(({ status, updated, changed }) => {
  const isUnsaved = status === TimelineStatus.draft;

  let statusContent: React.ReactNode = null;
  if (isUnsaved) {
    statusContent = <EuiTextColor color="warning">{i18n.UNSAVED}</EuiTextColor>;
  } else if (changed) {
    statusContent = <EuiTextColor color="warning">{i18n.UNSAVED_CHANGES}</EuiTextColor>;
  } else {
    statusContent = (
      <>
        {i18n.SAVED}{' '}
        <FormattedRelative
          data-test-subj="timeline-status"
          key="timeline-status-autosaved"
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          value={new Date(updated!)}
        />
      </>
    );
  }
  return (
    <EuiText size="xs" data-test-subj="timeline-status">
      {statusContent}
    </EuiText>
  );
});
TimelineStatusInfoComponent.displayName = 'TimelineStatusInfoComponent';
