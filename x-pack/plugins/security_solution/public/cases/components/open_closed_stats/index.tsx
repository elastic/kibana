/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiDescriptionList, EuiLoadingSpinner } from '@elastic/eui';
import { AlertStateStatus } from '../../../../common/detection_engine/types';
import * as i18n from '../all_cases/translations';

export interface Props {
  caseCount: number | null;
  caseStatus: AlertStateStatus;
  isLoading: boolean;
  dataTestSubj?: string;
}

export const OpenClosedStats = React.memo<Props>(
  ({ caseCount, caseStatus, isLoading, dataTestSubj }) => {
    const openClosedStats = useMemo(
      () => [
        {
          title: caseStatus === 'open' ? i18n.OPEN_CASES : i18n.CLOSED_CASES,
          description: isLoading ? <EuiLoadingSpinner /> : caseCount ?? 'N/A',
        },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [caseCount, caseStatus, isLoading, dataTestSubj]
    );
    return (
      <EuiDescriptionList
        data-test-subj={dataTestSubj}
        textStyle="reverse"
        listItems={openClosedStats}
      />
    );
  }
);

OpenClosedStats.displayName = 'OpenClosedStats';
