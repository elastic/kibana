/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getCreateCaseFlyoutLazyNoProvider } from '../../methods';
import { CasesContextState } from './cases_context_reducer';

export const CasesGlobalComponents = React.memo(({ state }: { state: CasesContextState }) => {
  return (
    <>
      {state.createCaseFlyout.isFlyoutOpen && state.createCaseFlyout.props !== undefined
        ? getCreateCaseFlyoutLazyNoProvider(state.createCaseFlyout.props)
        : null}
    </>
  );
});
CasesGlobalComponents.displayName = 'CasesContextUi';
