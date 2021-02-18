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
import { statuses } from '../status';
import * as i18n from './translations';

interface GetActions {
  caseStatus: string;
  dispatchUpdate: Dispatch<Omit<UpdateCase, 'refetchCasesStatus'>>;
  deleteCaseOnClick: (deleteCase: Case) => void;
}

const hasSubCases = (subCases: SubCase[] | null | undefined) =>
  subCases != null && subCases?.length > 0;

export const getActions = ({
  caseStatus,
  dispatchUpdate,
  deleteCaseOnClick,
}: GetActions): Array<DefaultItemIconButtonAction<Case>> => {
  const openCaseAction = {
    available: (item: Case) => caseStatus !== CaseStatuses.open && !hasSubCases(item.subCases),
    description: statuses[CaseStatuses.open].actions.single.title,
    icon: statuses[CaseStatuses.open].icon,
    name: statuses[CaseStatuses.open].actions.single.title,
    onClick: (theCase: Case) =>
      dispatchUpdate({
        updateKey: 'status',
        updateValue: CaseStatuses.open,
        caseId: theCase.id,
        version: theCase.version,
      }),
    type: 'icon' as const,
    'data-test-subj': 'action-open',
  };

  const makeInProgressAction = {
    available: (item: Case) =>
      caseStatus !== CaseStatuses['in-progress'] && !hasSubCases(item.subCases),
    description: statuses[CaseStatuses['in-progress']].actions.single.title,
    icon: statuses[CaseStatuses['in-progress']].icon,
    name: statuses[CaseStatuses['in-progress']].actions.single.title,
    onClick: (theCase: Case) =>
      dispatchUpdate({
        updateKey: 'status',
        updateValue: CaseStatuses['in-progress'],
        caseId: theCase.id,
        version: theCase.version,
      }),
    type: 'icon' as const,
    'data-test-subj': 'action-in-progress',
  };

  const closeCaseAction = {
    available: (item: Case) => caseStatus !== CaseStatuses.closed && !hasSubCases(item.subCases),
    description: statuses[CaseStatuses.closed].actions.single.title,
    icon: statuses[CaseStatuses.closed].icon,
    name: statuses[CaseStatuses.closed].actions.single.title,
    onClick: (theCase: Case) =>
      dispatchUpdate({
        updateKey: 'status',
        updateValue: CaseStatuses.closed,
        caseId: theCase.id,
        version: theCase.version,
      }),
    type: 'icon' as const,
    'data-test-subj': 'action-close',
  };

  return [
    {
      description: i18n.DELETE_CASE,
      icon: 'trash',
      name: i18n.DELETE_CASE,
      onClick: deleteCaseOnClick,
      type: 'icon',
      'data-test-subj': 'action-delete',
    },
    openCaseAction,
    makeInProgressAction,
    closeCaseAction,
  ];
};
