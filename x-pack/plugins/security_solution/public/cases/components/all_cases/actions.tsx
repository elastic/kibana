/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch } from 'react';
import { DefaultItemIconButtonAction } from '@elastic/eui/src/components/basic_table/action_types';

import { CaseStatuses } from '../../../../../case/common/api';
import { Case } from '../../containers/types';
import { UpdateCase } from '../../containers/use_get_cases';
import * as i18n from './translations';

interface GetActions {
  caseStatus: string;
  dispatchUpdate: Dispatch<Omit<UpdateCase, 'refetchCasesStatus'>>;
  deleteCaseOnClick: (deleteCase: Case) => void;
}

const hasSubCases = (subCases: Case[] | null | undefined) =>
  subCases != null && subCases?.length > 0;

export const getActions = ({
  caseStatus,
  dispatchUpdate,
  deleteCaseOnClick,
}: GetActions): Array<DefaultItemIconButtonAction<Case>> => [
  {
    available: (item) => !hasSubCases(item.subCases),
    description: i18n.DELETE_CASE,
    icon: 'trash',
    name: i18n.DELETE_CASE,
    onClick: deleteCaseOnClick,
    type: 'icon',
    'data-test-subj': 'action-delete',
  },
  {
    available: (item) => caseStatus === CaseStatuses.open && !hasSubCases(item.subCases),
    description: i18n.CLOSE_CASE,
    icon: 'folderCheck',
    name: i18n.CLOSE_CASE,
    onClick: (theCase: Case) =>
      dispatchUpdate({
        updateKey: 'status',
        updateValue: CaseStatuses.closed,
        caseId: theCase.id,
        version: theCase.version,
      }),
    type: 'icon',
    'data-test-subj': 'action-close',
  },
  {
    available: (item) => caseStatus !== CaseStatuses.open && !hasSubCases(item.subCases),
    description: i18n.REOPEN_CASE,
    icon: 'folderExclamation',
    name: i18n.REOPEN_CASE,
    onClick: (theCase: Case) =>
      dispatchUpdate({
        updateKey: 'status',
        updateValue: CaseStatuses.open,
        caseId: theCase.id,
        version: theCase.version,
      }),
    type: 'icon',
    'data-test-subj': 'action-open',
  },
];
