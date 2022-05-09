/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { ACTION_OSQUERY } from './translations';

interface IProps {
  handleClick: () => void;
}

export const OsqueryActionItem = ({ handleClick }: IProps) => {
  return (
    <EuiContextMenuItem
      key="osquery-action-item"
      data-test-subj="osquery-action-item"
      onClick={handleClick}
    >
      {ACTION_OSQUERY}
    </EuiContextMenuItem>
  );
};
