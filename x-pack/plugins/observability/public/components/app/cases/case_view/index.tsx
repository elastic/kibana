/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  getCaseDetailsUrl,
  getCaseDetailsUrlWithCommentId,
  getCaseUrl,
  getConfigureCasesUrl,
  useFormatUrl,
} from '../../../../pages/cases/links';
import { Case } from '../../../../../../cases/common';
import { useFetchAlertData } from './helpers';
import { useKibana } from '../../../../utils/kibana_react';
import { CASES_APP_ID } from '../constants';
import { casesBreadcrumbs, useBreadcrumbs } from '../../../../hooks/use_breadcrumbs';

interface Props {
  caseId: string;
  subCaseId?: string;
  userCanCrud: boolean;
}

export interface OnUpdateFields {
  key: keyof Case;
  value: Case[keyof Case];
  onSuccess?: () => void;
  onError?: () => void;
}

export interface CaseProps extends Props {
  fetchCase: () => void;
  caseData: Case;
  updateCase: (newCase: Case) => void;
}

export const CaseView = React.memo(({ caseId, subCaseId, userCanCrud }: Props) => {
  const [caseTitle, setCaseTitle] = useState<string | null>(null);

  const { cases: casesUi, application } = useKibana().services;
  const { navigateToApp } = application;
  const allCasesLink = getCaseUrl();
  const { formatUrl } = useFormatUrl(CASES_APP_ID);
  const href = formatUrl(allCasesLink);
  useBreadcrumbs([
    { ...casesBreadcrumbs.cases, href },
    ...(caseTitle !== null
      ? [
          {
            text: caseTitle,
          },
        ]
      : []),
  ]);

  const onCaseDataSuccess = useCallback(
    (data: Case) => {
      if (caseTitle === null) {
        setCaseTitle(data.title);
      }
    },
    [caseTitle]
  );

  const configureCasesLink = getConfigureCasesUrl();
  const allCasesHref = href;
  const configureCasesHref = formatUrl(configureCasesLink);
  const caseDetailsHref = formatUrl(getCaseDetailsUrl({ id: caseId }), { absolute: true });
  const getCaseDetailHrefWithCommentId = useCallback(
    (commentId: string) =>
      formatUrl(getCaseDetailsUrlWithCommentId({ id: caseId, commentId, subCaseId }), {
        absolute: true,
      }),
    [caseId, formatUrl, subCaseId]
  );

  return casesUi.getCaseView({
    allCasesNavigation: {
      href: allCasesHref,
      onClick: async (ev) => {
        if (ev != null) {
          ev.preventDefault();
        }
        return navigateToApp(`${CASES_APP_ID}`, {
          path: allCasesLink,
        });
      },
    },
    caseDetailsNavigation: {
      href: caseDetailsHref,
      onClick: async (ev) => {
        if (ev != null) {
          ev.preventDefault();
        }
        return navigateToApp(`${CASES_APP_ID}`, {
          path: getCaseDetailsUrl({ id: caseId }),
        });
      },
    },
    caseId,
    configureCasesNavigation: {
      href: configureCasesHref,
      onClick: async (ev) => {
        if (ev != null) {
          ev.preventDefault();
        }
        return navigateToApp(`${CASES_APP_ID}`, {
          path: configureCasesLink,
        });
      },
    },
    getCaseDetailHrefWithCommentId,
    onCaseDataSuccess,
    subCaseId,
    useFetchAlertData,
    userCanCrud,
  });
});
