/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import type { ReactElement } from 'react-markdown';
import * as i18n from '../translations';
import { LinkAnchor } from '../../links';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useCreateCaseNavigation } from '../../../common/navigation';
import type { FilterMode as RecentCasesFilterMode } from '../types';

export interface NoCasesComp {
  recentCasesFilterBy: RecentCasesFilterMode;
}

const NoCasesComponent = ({ recentCasesFilterBy }: NoCasesComp) => {
  const { permissions } = useCasesContext();
  const { getCreateCaseUrl, navigateToCreateCase } = useCreateCaseNavigation();

  const navigateToCreateCaseClick = useCallback(
    (e) => {
      e.preventDefault();
      navigateToCreateCase();
    },
    [navigateToCreateCase]
  );

  const getNoCasesMessage = (): ReactElement => {
    if (recentCasesFilterBy === 'myRecentlyAssigned') {
      return <span data-test-subj="no-cases-assigned-to-me">{i18n.NO_CASES_ASSIGNED_TO_ME}</span>;
    }

    return (
      <>
        <span>{i18n.NO_CASES}</span>
        <LinkAnchor
          data-test-subj="no-cases-create-case"
          onClick={navigateToCreateCaseClick}
          href={getCreateCaseUrl()}
        >{` ${i18n.START_A_NEW_CASE}`}</LinkAnchor>
        {'!'}
      </>
    );
  };

  return permissions.create ? (
    getNoCasesMessage()
  ) : (
    <span data-test-subj="no-cases-readonly">{i18n.NO_CASES_READ_ONLY}</span>
  );
};

NoCasesComponent.displayName = 'NoCasesComponent';

export const NoCases = React.memo(NoCasesComponent);
