/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { observabilityAppId } from '../../../../../common';

import {
  getCaseDetailsUrl,
  getConfigureCasesUrl,
  getCreateCaseUrl,
  useFormatUrl,
} from '../../../../pages/cases/links';
import { useKibana } from '../../../../utils/kibana_react';
import { CASES_OWNER } from '../constants';

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
    application: { getUrlForApp, navigateToUrl },
  } = useKibana().services;
  const { formatUrl } = useFormatUrl();

  const casesUrl = `${getUrlForApp(observabilityAppId)}/cases`;
  return casesUi.getAllCases({
    caseDetailsNavigation: {
      href: ({ detailName, subCaseId }: AllCasesNavProps) => {
        return formatUrl(getCaseDetailsUrl({ id: detailName, subCaseId }));
      },
      onClick: async ({ detailName, subCaseId, search }: AllCasesNavProps) =>
        navigateToUrl(`${casesUrl}${getCaseDetailsUrl({ id: detailName, subCaseId })}`),
    },
    configureCasesNavigation: {
      href: formatUrl(getConfigureCasesUrl()),
      onClick: async (ev) => {
        if (ev != null) {
          ev.preventDefault();
        }
        return navigateToUrl(`${casesUrl}${getConfigureCasesUrl()}`);
      },
    },
    createCaseNavigation: {
      href: formatUrl(getCreateCaseUrl()),
      onClick: async (ev) => {
        if (ev != null) {
          ev.preventDefault();
        }
        return navigateToUrl(`${casesUrl}${getCreateCaseUrl()}`);
      },
    },
    disableAlerts: true,
    showTitle: false,
    userCanCrud,
    owner: [CASES_OWNER],
  });
});

AllCases.displayName = 'AllCases';
