/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';
import { euiStyled } from '../../../../../observability/public';
import {
  missingMlPrivilegesTitle,
  missingMlResultsPrivilegesDescription,
} from './missing_privileges_messages';
import { UserManagementLink } from './user_management_link';

export const MissingResultsPrivilegesPrompt: React.FunctionComponent = () => (
  <EmptyPrompt
    title={<h2>{missingMlPrivilegesTitle}</h2>}
    body={<p>{missingMlResultsPrivilegesDescription}</p>}
    actions={<UserManagementLink />}
  />
);

const EmptyPrompt = euiStyled(EuiEmptyPrompt)`
  align-self: center;
`;
