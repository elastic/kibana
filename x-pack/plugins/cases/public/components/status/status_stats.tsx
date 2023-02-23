/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiDescriptionList, EuiLoadingSpinner } from '@elastic/eui';
import type { CaseStatuses } from '../../../common/api';
import { statuses } from './config';

export interface Props {
  caseCount: number | null;
  caseStatus: CaseStatuses;
  isLoading: boolean;
  dataTestSubj?: string;
}

const StatusStatsComponent: React.FC<Props> = ({
  caseCount,
  caseStatus,
  isLoading,
  dataTestSubj,
}) => {
  const statusStats = useMemo(
    () => [
      {
        title: statuses[caseStatus].stats.title,
        description: isLoading ? (
          <EuiLoadingSpinner data-test-subj={`${dataTestSubj}-loading-spinner`} />
        ) : (
          caseCount ?? '-'
        ),
      },
    ],
    [caseCount, caseStatus, dataTestSubj, isLoading]
  );
  return (
    <EuiDescriptionList data-test-subj={dataTestSubj} textStyle="reverse" listItems={statusStats} />
  );
};

StatusStatsComponent.displayName = 'StatusStats';
export const StatusStats = memo(StatusStatsComponent);
