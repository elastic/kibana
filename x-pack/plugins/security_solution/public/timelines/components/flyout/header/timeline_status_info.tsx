/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiBadge } from '@elastic/eui';

import styled from 'styled-components';
import { TimelineStatus } from '../../../../../common/api/timeline';
import * as i18n from './translations';

const NoWrapText = styled(EuiText)`
  white-space: nowrap;
`;

export interface TimelineStatusInfoProps {
  status: TimelineStatus;
  updated?: number;
  changed?: boolean;
}

export const TimelineStatusInfo = React.memo<TimelineStatusInfoProps>(
  ({ status, updated, changed }) => {
    const isUnsaved = status === TimelineStatus.draft;

    let statusContent: React.ReactNode = null;
    if (isUnsaved || !updated) {
      statusContent = <EuiBadge color="warning">{i18n.UNSAVED}</EuiBadge>;
    } else if (changed) {
      statusContent = <EuiBadge color="warning">{i18n.UNSAVED_CHANGES}</EuiBadge>;
    }

    if (!statusContent) return null;

    return (
      <NoWrapText size="xs" data-test-subj="timeline-status">
        {statusContent}
      </NoWrapText>
    );
  }
);
TimelineStatusInfo.displayName = 'TimelineStatusInfo';
