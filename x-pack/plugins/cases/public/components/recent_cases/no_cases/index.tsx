/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiLink } from '@elastic/eui';
import * as i18n from '../translations';

const NoCasesComponent = ({ createCaseHref }: { createCaseHref: string }) => (
  <>
    <span>{i18n.NO_CASES}</span>
    <EuiLink
      data-test-subj="no-cases-create-case"
      href={createCaseHref}
    >{` ${i18n.START_A_NEW_CASE}`}</EuiLink>
    {'!'}
  </>
);

NoCasesComponent.displayName = 'NoCasesComponent';

export const NoCases = React.memo(NoCasesComponent);
