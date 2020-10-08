/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiTableRow, EuiTableRowCell } from '@elastic/eui';

import { IUser } from '../../../types';

interface IUserRowProps {
  user: IUser;
  showEmail?: boolean;
}

export const UserRow: React.FC<IUserRowProps> = ({ user: { name, email }, showEmail }) => (
  <EuiTableRow>
    <EuiTableRowCell>{name}</EuiTableRowCell>
    <EuiTableRowCell>{showEmail && <span>{email}</span>}</EuiTableRowCell>
  </EuiTableRow>
);
