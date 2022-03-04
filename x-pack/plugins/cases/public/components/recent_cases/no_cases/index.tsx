/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import * as i18n from '../translations';
import { LinkAnchor } from '../../links';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useCreateCaseNavigation } from '../../../common/navigation';

const NoCasesComponent = () => {
  const { userCanCrud } = useCasesContext();
  const { getCreateCaseUrl, navigateToCreateCase } = useCreateCaseNavigation();

  const navigateToCreateCaseClick = useCallback(
    (e) => {
      e.preventDefault();
      navigateToCreateCase();
    },
    [navigateToCreateCase]
  );

  return userCanCrud ? (
    <>
      <span>{i18n.NO_CASES}</span>
      <LinkAnchor
        data-test-subj="no-cases-create-case"
        onClick={navigateToCreateCaseClick}
        href={getCreateCaseUrl()}
      >{` ${i18n.START_A_NEW_CASE}`}</LinkAnchor>
      {'!'}
    </>
  ) : (
    <span data-test-subj="no-cases-readonly">{i18n.NO_CASES_READ_ONLY}</span>
  );
};

NoCasesComponent.displayName = 'NoCasesComponent';

export const NoCases = React.memo(NoCasesComponent);
