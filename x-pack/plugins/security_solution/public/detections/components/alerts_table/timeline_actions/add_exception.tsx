/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React from 'react';
import * as i18n from '../translations';

interface AddExceptionProps {
  disabled?: boolean;
  onClick: () => void;
}

const AddExceptionComponent: React.FC<AddExceptionProps> = ({ disabled, onClick }) => {
  return (
    <EuiContextMenuItem
      key="add-exception-menu-item"
      aria-label={i18n.ACTION_ADD_EXCEPTION}
      data-test-subj="add-exception-menu-item"
      id="addException"
      onClick={onClick}
      disabled={disabled}
    >
      {i18n.ACTION_ADD_EXCEPTION}
    </EuiContextMenuItem>
  );
};

export const AddException = React.memo(AddExceptionComponent);
