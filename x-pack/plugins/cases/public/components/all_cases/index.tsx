/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useMemo } from 'react';
import { CasesDeepLinkId } from '../../common/navigation';
import { useGetActionLicense } from '../../containers/use_get_action_license';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useCasesBreadcrumbs } from '../use_breadcrumbs';
import { getActionLicenseError } from '../use_push_to_service/helpers';
import { AllCasesList } from './all_cases_list';
import { CasesTableHeader } from './header';

export const AllCases: React.FC = () => {
  const { userCanCrud } = useCasesContext();
  const [refresh, setRefresh] = useState<number>(0);
  useCasesBreadcrumbs(CasesDeepLinkId.cases);

  const doRefresh = useCallback(() => {
    setRefresh((prev) => prev + 1);
  }, [setRefresh]);

  const { actionLicense } = useGetActionLicense();
  const actionsErrors = useMemo(() => getActionLicenseError(actionLicense), [actionLicense]);

  return (
    <>
      <CasesTableHeader actionsErrors={actionsErrors} refresh={refresh} userCanCrud={userCanCrud} />
      <AllCasesList doRefresh={doRefresh} />
    </>
  );
};
AllCases.displayName = 'AllCases';

// eslint-disable-next-line import/no-default-export
export { AllCases as default };
