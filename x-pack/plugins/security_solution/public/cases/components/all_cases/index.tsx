/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useHistory } from 'react-router-dom';

import { CaseStatuses } from '../../../../../cases/common';
import { Case, SubCase } from '../../containers/types';
import {
  getCaseDetailsUrl,
  getConfigureCasesUrl,
  getCreateCaseUrl,
  useFormatUrl,
} from '../../../common/components/link_to';
import { SecurityPageName } from '../../../app/types';
import { useKibana } from '../../../common/lib/kibana';
import { APP_ID } from '../../../../common/constants';

interface AllCasesNavProps {
  detailName: string;
  search?: string;
  subCaseId?: string;
}

interface AllCasesProps {
  disabledStatuses?: CaseStatuses[];
  isModal?: boolean;
  onRowClick?: (theCase?: Case | SubCase) => void;
  userCanCrud: boolean;
}
export const AllCases = React.memo<AllCasesProps>(
  ({ disabledStatuses, isModal = false, onRowClick, userCanCrud }) => {
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
      configureCasesHref: formatUrl(getConfigureCasesUrl()),
      createCaseHref: formatUrl(getCreateCaseUrl()),
      disabledStatuses,
      getCaseDetailsHref: ({ detailName, subCaseId }: AllCasesNavProps) => {
        return formatUrl(getCaseDetailsUrl({ id: detailName, subCaseId }));
      },
      isModal,
      onCaseDetailsNavClick: ({ detailName, subCaseId, search }: AllCasesNavProps) => {
        navigateToApp(`${APP_ID}:${SecurityPageName.case}`, {
          path: getCaseDetailsUrl({ id: detailName, search, subCaseId }),
        });
      },
      onConfigureCasesNavClick: goToCaseConfigure,
      onCreateCaseNavClick: goToCreateCase,
      onRowClick,
      userCanCrud,
    });
  }
);

AllCases.displayName = 'AllCases';
