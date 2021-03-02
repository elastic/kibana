/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch } from 'react';
import { DefaultItemIconButtonAction } from '@elastic/eui/src/components/basic_table/action_types';

import { CaseStatuses } from '../../../../../case/common/api';
import { Case, SubCase } from '../../containers/types';
import { UpdateCase } from '../../containers/use_get_cases';
import * as i18n from './translations';
import { isIndividual } from './helpers';

interface GetActions {
  caseStatus: string;
  dispatchUpdate: Dispatch<Omit<UpdateCase, 'refetchCasesStatus'>>;
  deleteCaseOnClick: (deleteCase: Case) => void;
}

export const getActions = ({
  caseStatus,
  dispatchUpdate,
  deleteCaseOnClick,
}: GetActions): Array<DefaultItemIconButtonAction<Case>> => [
  {
    description: i18n.DELETE_CASE,
    icon: 'trash',
    name: i18n.DELETE_CASE,
    onClick: deleteCaseOnClick,
    type: 'icon',
    'data-test-subj': 'action-delete',
  },
  {
    available: (item: Case | SubCase) => item.status !== CaseStatuses.closed,
    enabled: (item: Case | SubCase) => isIndividual(item),
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
    available: (item: Case | SubCase) => item.status !== CaseStatuses.open,
    enabled: (item: Case | SubCase) => isIndividual(item),
    description: i18n.REOPEN_CASE,
    icon: 'folderOpen',
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
