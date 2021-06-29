/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import {
  getCaseDetailsUrl,
  getConfigureCasesUrl,
  getCreateCaseUrl,
  useFormatUrl,
} from '../../../common/components/link_to';
import { SecurityPageName } from '../../../app/types';
import { useKibana } from '../../../common/lib/kibana';
import { APP_ID } from '../../../../common/constants';

export interface AllCasesNavProps {
  detailName: string;
  search?: string;
  subCaseId?: string;
}

interface AllCasesProps {
  userCanCrud: boolean;
}
export const AllCases = React.memo<AllCasesProps>(({ userCanCrud }) => {
  const {
    cases: casesUi,
    application: { navigateToApp },
  } = useKibana().services;
  const { formatUrl, search: urlSearch } = useFormatUrl(SecurityPageName.case);

  const goToCreateCase = useCallback(
    async (ev) => {
      ev.preventDefault();
      return navigateToApp(APP_ID, {
        deepLinkId: SecurityPageName.case,
        path: getCreateCaseUrl(urlSearch),
      });
    },
    [navigateToApp, urlSearch]
  );

  const goToCaseConfigure = useCallback(
    async (ev) => {
      ev.preventDefault();
      return navigateToApp(APP_ID, {
        deepLinkId: SecurityPageName.case,
        path: getConfigureCasesUrl(urlSearch),
      });
    },
    [navigateToApp, urlSearch]
  );

  return casesUi.getAllCases({
    caseDetailsNavigation: {
      href: ({ detailName, subCaseId }: AllCasesNavProps) => {
        return formatUrl(getCaseDetailsUrl({ id: detailName, subCaseId }));
      },
      onClick: async ({ detailName, subCaseId, search }: AllCasesNavProps) => {
        return navigateToApp(APP_ID, {
          deepLinkId: SecurityPageName.case,
          path: getCaseDetailsUrl({ id: detailName, search, subCaseId }),
        });
      },
    },
    configureCasesNavigation: {
      href: formatUrl(getConfigureCasesUrl()),
      onClick: goToCaseConfigure,
    },
    createCaseNavigation: {
      href: formatUrl(getCreateCaseUrl()),
      onClick: goToCreateCase,
    },
    userCanCrud,
    owner: [APP_ID],
  });
});

AllCases.displayName = 'AllCases';
