/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useHistory } from 'react-router-dom';
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
  const [spyState, setSpyState] = useState<{ caseTitle: string | undefined }>({
    caseTitle: undefined,
  });

  const onCaseDataSuccess = useCallback(
    (data: Case) => {
      if (spyState.caseTitle === undefined) {
        setSpyState({ caseTitle: data.title });
      }
    },
    [spyState.caseTitle]
  );

  const {
    cases: casesUi,
    application: { navigateToApp },
  } = useKibana().services;
  const history = useHistory();
  const { formatUrl } = useFormatUrl(CASES_APP_ID);

  const allCasesLink = getCaseUrl();
  const formattedAllCasesLink = formatUrl(allCasesLink);
  const backToAllCasesOnClick = useCallback(
    (ev) => {
      ev.preventDefault();
      history.push(allCasesLink);
    },
    [allCasesLink, history]
  );
  const caseDetailsLink = formatUrl(getCaseDetailsUrl({ id: caseId }), { absolute: true });
  const getCaseDetailHrefWithCommentId = (commentId: string) => {
    return formatUrl(getCaseDetailsUrlWithCommentId({ id: caseId, commentId, subCaseId }), {
      absolute: true,
    });
  };

  const configureCasesHref = formatUrl(getConfigureCasesUrl());
  const onConfigureCasesNavClick = useCallback(
    (ev) => {
      ev.preventDefault();
      history.push(getConfigureCasesUrl());
    },
    [history]
  );
  return casesUi.getCaseView({
    allCasesNavigation: {
      href: formattedAllCasesLink,
      onClick: backToAllCasesOnClick,
    },
    caseDetailsNavigation: {
      href: caseDetailsLink,
      onClick: () => {
        navigateToApp(`${CASES_APP_ID}`, {
          path: getCaseDetailsUrl({ id: caseId }),
        });
      },
    },
    caseId,
    configureCasesNavigation: {
      href: configureCasesHref,
      onClick: onConfigureCasesNavClick,
    },
    getCaseDetailHrefWithCommentId,
    onCaseDataSuccess,
    subCaseId,
    useFetchAlertData,
    userCanCrud,
  });
});

CaseView.displayName = 'CaseView';
