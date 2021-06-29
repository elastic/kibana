/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import * as i18n from '../translations';
import { useKibana } from '../../../common/lib/kibana';
import { LinkAnchor } from '../../links';

const NoCasesComponent = ({
  createCaseHref,
  hasWritePermissions,
}: {
  createCaseHref: string;
  hasWritePermissions: boolean;
}) => {
  const { navigateToUrl } = useKibana().services.application;
  const goToCaseCreation = useCallback(
    (e) => {
      e.preventDefault();
      navigateToUrl(createCaseHref);
    },
    [createCaseHref, navigateToUrl]
  );
  return hasWritePermissions ? (
    <>
      <span>{i18n.NO_CASES}</span>
      <LinkAnchor
        data-test-subj="no-cases-create-case"
        onClick={goToCaseCreation}
        href={createCaseHref}
      >{` ${i18n.START_A_NEW_CASE}`}</LinkAnchor>
      {'!'}
    </>
  ) : (
    <span data-test-subj="no-cases-readonly">{i18n.NO_CASES_READ_ONLY}</span>
  );
};

NoCasesComponent.displayName = 'NoCasesComponent';

export const NoCases = React.memo(NoCasesComponent);
