/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useMemo } from 'react';
import { useGetActionLicense } from '../../containers/use_get_action_license';
import { Owner } from '../../types';
import { CaseDetailsHrefSchema, CasesNavigation } from '../links';
import { OwnerProvider } from '../owner_context';
import { getActionLicenseError } from '../use_push_to_service/helpers';
import { AllCasesList } from './all_cases_list';
import { CasesTableHeader } from './header';

export interface AllCasesProps {
  caseDetailsNavigation: CasesNavigation<CaseDetailsHrefSchema, 'configurable'>; // if not passed, case name is not displayed as a link (Formerly dependant on isSelector)
  configureCasesNavigation: CasesNavigation; // if not passed, header with nav is not displayed (Formerly dependant on isSelector)
  createCaseNavigation: CasesNavigation;
  disableAlerts?: boolean;
  showTitle?: boolean;
  userCanCrud: boolean;
}

export const AllCases: React.FC<AllCasesProps> = (props) => {
  const { createCaseNavigation, configureCasesNavigation, showTitle, userCanCrud } = props;

  const [refresh, setRefresh] = useState<number>(0);
  const doRefresh = useCallback(() => {
    setRefresh((prev) => prev + 1);
  }, [setRefresh]);

  const { actionLicense } = useGetActionLicense();
  const actionsErrors = useMemo(() => getActionLicenseError(actionLicense), [actionLicense]);

  return (
    <>
      <CasesTableHeader
        actionsErrors={actionsErrors}
        createCaseNavigation={createCaseNavigation}
        configureCasesNavigation={configureCasesNavigation}
        refresh={refresh}
        showTitle={showTitle}
        userCanCrud={userCanCrud}
      />
      <AllCasesList {...props} doRefresh={doRefresh} />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { AllCases as default };
