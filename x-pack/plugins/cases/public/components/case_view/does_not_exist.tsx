/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';
import type { CasesNavigation } from '../links';
import * as i18n from './translations';

interface Props {
  allCasesNavigation: CasesNavigation;
  caseId: string;
}

export const DoesNotExist = ({ allCasesNavigation, caseId }: Props) => (
  <EuiEmptyPrompt
    iconColor="default"
    iconType="addDataApp"
    title={<h2>{i18n.DOES_NOT_EXIST_TITLE}</h2>}
    titleSize="xs"
    body={<p>{i18n.DOES_NOT_EXIST_DESCRIPTION(caseId)}</p>}
    actions={
      <EuiButton onClick={allCasesNavigation.onClick} size="s" color="primary" fill>
        {i18n.DOES_NOT_EXIST_BUTTON}
      </EuiButton>
    }
  />
);
