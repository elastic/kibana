/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiButton } from '@elastic/eui';

import { CaseStatuses, caseStatuses } from '../../../common/api';
import { statuses } from './config';

interface Props {
  status: CaseStatuses;
  isLoading: boolean;
  onStatusChanged: (status: CaseStatuses) => void;
}

// Rotate over the statuses. open -> in-progress -> closes -> open...
const getNextItem = (item: number) => (item + 1) % caseStatuses.length;

const StatusActionButtonComponent: React.FC<Props> = ({ status, onStatusChanged, isLoading }) => {
  const indexOfCurrentStatus = useMemo(
    () => caseStatuses.findIndex((caseStatus) => caseStatus === status),
    [status]
  );
  const nextStatusIndex = useMemo(() => getNextItem(indexOfCurrentStatus), [indexOfCurrentStatus]);

  const onClick = useCallback(() => {
    onStatusChanged(caseStatuses[nextStatusIndex]);
  }, [nextStatusIndex, onStatusChanged]);

  return (
    <EuiButton
      data-test-subj="case-view-status-action-button"
      iconType={statuses[caseStatuses[nextStatusIndex]].icon}
      isLoading={isLoading}
      onClick={onClick}
    >
      {statuses[caseStatuses[nextStatusIndex]].button.label}
    </EuiButton>
  );
};
StatusActionButtonComponent.displayName = 'StatusActionButton';
export const StatusActionButton = memo(StatusActionButtonComponent);
