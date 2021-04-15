/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import {
  getCaseDetailsUrl,
  getCaseUrl,
  getCreateCaseUrl,
} from '../../../common/components/link_to/redirect_to_case';
import { useFormatUrl } from '../../../common/components/link_to';
import { useKibana } from '../../../common/lib/kibana';
import { APP_ID } from '../../../../common/constants';
import { SecurityPageName } from '../../../app/types';
import { AllCasesNavProps } from '../../../cases/components/all_cases';

const MAX_CASES_TO_SHOW = 3;
const RecentCasesComponent = () => {
  const { formatUrl } = useFormatUrl(SecurityPageName.case);
  const {
    cases: casesUi,
    application: { navigateToApp },
  } = useKibana().services;

  const goToCases = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(`${APP_ID}:${SecurityPageName.case}`);
    },
    [navigateToApp]
  );

  return casesUi.getRecentCases({
    allCasesNavigation: {
      href: formatUrl(getCaseUrl()),
      onClick: goToCases,
    },
    caseDetailsNavigation: {
      href: ({ detailName, subCaseId }: AllCasesNavProps) => {
        return formatUrl(getCaseDetailsUrl({ id: detailName, subCaseId }));
      },
      onClick: ({ detailName, subCaseId, search }: AllCasesNavProps) => {
        navigateToApp(`${APP_ID}:${SecurityPageName.case}`, {
          path: getCaseDetailsUrl({ id: detailName, search, subCaseId }),
        });
      },
    },
    createCaseNavigation: {
      href: formatUrl(getCreateCaseUrl()),
      onClick: () => {
        navigateToApp(`${APP_ID}:${SecurityPageName.case}`, {
          path: getCreateCaseUrl(),
        });
      },
    },
    maxCasesToShow: MAX_CASES_TO_SHOW,
  });
};

RecentCasesComponent.displayName = 'RecentCasesComponent';

export const RecentCases = React.memo(RecentCasesComponent);
