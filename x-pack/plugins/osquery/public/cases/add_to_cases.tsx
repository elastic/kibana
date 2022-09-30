/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useKibana } from '../common/lib/kibana';
import type { AddToCaseButtonProps } from './add_to_cases_button';
import { AddToCaseButton } from './add_to_cases_button';

const CASES_OWNER: string[] = [];

type AddToCaseWRapperProps = Omit<AddToCaseButtonProps, 'actionId'>;
export const AddToCaseWrapper: React.FC<AddToCaseWRapperProps & { actionId?: string }> = React.memo(
  (props) => {
    const { cases } = useKibana().services;

    if (props.hideAddToCases || !props.actionId) {
      return <></>;
    }

    const casePermissions = cases.helpers.canUseCases();
    const CasesContext = cases.ui.getCasesContext();

    return (
      <CasesContext owner={CASES_OWNER} permissions={casePermissions}>
        <AddToCaseButton {...props} actionId={props.actionId} />
      </CasesContext>
    );
  }
);

AddToCaseWrapper.displayName = 'AddToCaseWrapper';
