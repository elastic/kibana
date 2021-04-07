/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useHistory } from 'react-router-dom';

import { Case, CaseStatuses, CommentRequestAlertType, SubCase } from '../../../../../cases/common';
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
  alertData?: Omit<CommentRequestAlertType, 'type'>;
  disabledStatuses?: CaseStatuses[];
  isModal?: boolean;
  onRowClick?: (theCase?: Case | SubCase) => void;
  updateCase?: (newCase: Case) => void;
  userCanCrud: boolean;
}
export const AllCases = React.memo<AllCasesProps>(
  ({ alertData, disabledStatuses, isModal = false, onRowClick, updateCase, userCanCrud }) => {
    const {
      cases: casesUi,
      application: { navigateToApp },
    } = useKibana().services;
    const history = useHistory();
    const { formatUrl, search: urlSearch } = useFormatUrl(SecurityPageName.case);

    const goToCreateCase = useCallback(
      (ev) => {
        ev.preventDefault();
        if (isModal && onRowClick != null) {
          onRowClick();
        } else {
          navigateToApp(`${APP_ID}:${SecurityPageName.case}`, {
            path: getCreateCaseUrl(urlSearch),
          });
        }
      },
      [navigateToApp, isModal, onRowClick, urlSearch]
    );

    const goToCaseConfigure = useCallback(
      (ev) => {
        ev.preventDefault();
        history.push(getConfigureCasesUrl(urlSearch));
      },
      [history, urlSearch]
    );

    return casesUi.getAllCases({
      alertData,
      caseDetailsNavigation: {
        getHref: ({ detailName, subCaseId }: AllCasesNavProps) => {
          return formatUrl(getCaseDetailsUrl({ id: detailName, subCaseId }));
        },
        onClick: ({ detailName, subCaseId, search }: AllCasesNavProps) => {
          navigateToApp(`${APP_ID}:${SecurityPageName.case}`, {
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
      disabledStatuses,
      isModal,
      onRowClick,
      updateCase,
      userCanCrud,
    });
  }
);

AllCases.displayName = 'AllCases';
