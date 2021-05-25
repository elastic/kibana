/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Owner } from '../../types';
import { CaseDetailsHrefSchema, CasesNavigation } from '../links';
import { OwnerProvider } from '../owner_context';
import { AllCasesGeneric } from './all_cases_generic';
export interface AllCasesProps extends Owner {
  caseDetailsNavigation: CasesNavigation<CaseDetailsHrefSchema, 'configurable'>; // if not passed, case name is not displayed as a link (Formerly dependant on isSelector)
  configureCasesNavigation: CasesNavigation; // if not passed, header with nav is not displayed (Formerly dependant on isSelector)
  createCaseNavigation: CasesNavigation;
  disableAlerts?: boolean;
  showTitle?: boolean;
  userCanCrud: boolean;
}

export const AllCases: React.FC<AllCasesProps> = (props) => {
  return (
    <OwnerProvider owner={props.owner}>
      <AllCasesGeneric {...props} />
    </OwnerProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export { AllCases as default };
