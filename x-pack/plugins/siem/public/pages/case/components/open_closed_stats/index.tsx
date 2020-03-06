/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Dispatch, useEffect, useMemo } from 'react';
import { EuiDescriptionList, EuiLoadingSpinner } from '@elastic/eui';
import * as i18n from '../all_cases/translations';
import { CaseCount } from '../../../../containers/case/use_get_cases';

export interface Props {
  caseCount: CaseCount;
  caseState: 'open' | 'closed';
  getCaseCount: Dispatch<keyof CaseCount>;
  isLoading: boolean;
}

export const OpenClosedStats = React.memo<Props>(
  ({ caseCount, caseState, getCaseCount, isLoading }) => {
    useEffect(() => {
      getCaseCount(caseState);
    }, [caseState]);

    const openClosedStats = useMemo(
      () => [
        {
          title: caseState === 'open' ? i18n.OPEN_CASES : i18n.CLOSED_CASES,
          description: isLoading ? <EuiLoadingSpinner /> : caseCount[caseState],
        },
      ],
      [caseCount, caseState, isLoading]
    );
    return <EuiDescriptionList textStyle="reverse" listItems={openClosedStats} />;
  }
);

OpenClosedStats.displayName = 'OpenClosedStats';
