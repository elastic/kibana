/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import { useGetUserCasesPermissions } from './use_get_cases_permissions';
import { useKibana } from '../common/lib/kibana';
import { AddToCaseButton } from './add_to_cases_button';

interface IProps {
  queryId?: string;
  agentIds?: string[];
  actionId: string;
  isIcon?: boolean;
  isDisabled?: boolean;
}

export const AddToCase: React.FC<IProps> = (props) => {
  const { cases } = useKibana().services;
  const casePermissions = useGetUserCasesPermissions();
  const CasesContext = cases.ui.getCasesContext();
  const casesOwner = useMemo(() => [SECURITY_SOLUTION_OWNER, OBSERVABILITY_OWNER], []);

  return (
    <CasesContext owner={casesOwner} permissions={casePermissions}>
      <AddToCaseButton {...props} />
    </CasesContext>
  );
};
