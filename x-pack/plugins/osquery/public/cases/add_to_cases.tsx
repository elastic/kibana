/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';

import { CasesAttachmentWrapperContext } from '../shared_components/attachments/pack_queries_attachment_wrapper';
import { useKibana } from '../common/lib/kibana';
import type { AddToCaseButtonProps } from './add_to_cases_button';
import { AddToCaseButton } from './add_to_cases_button';

const CASES_OWNER: string[] = [];

export const AddToCaseWrapper = React.memo<AddToCaseButtonProps>((props) => {
  const { cases } = useKibana().services;
  const isCasesAttachment = useContext(CasesAttachmentWrapperContext);

  if (isCasesAttachment || !props.actionId) {
    return <></>;
  }

  const casePermissions = cases.helpers.canUseCases();
  const CasesContext = cases.ui.getCasesContext();

  return (
    <CasesContext owner={CASES_OWNER} permissions={casePermissions}>
      <AddToCaseButton {...props} />
    </CasesContext>
  );
});

AddToCaseWrapper.displayName = 'AddToCaseWrapper';
