/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem, EuiText } from '@elastic/eui';
import React from 'react';
import * as i18n from '../translations';

interface AddExceptionProps {
  disabled?: boolean;
  eventKind?: string | null | undefined;
  onClick: () => void;
  ruleId: string | null | undefined;
}

const AddExceptionComponent: React.FC<AddExceptionProps> = ({
  disabled,
  eventKind,
  onClick,
  ruleId,
}) => {
  return eventKind === 'event' && ruleId ? (
    <EuiContextMenuItem
      key="add-exception-menu-item"
      aria-label={i18n.ACTION_ADD_EXCEPTION}
      data-test-subj="add-exception-menu-item"
      id="addException"
      onClick={onClick}
      disabled={disabled}
    >
      <EuiText data-test-subj="addExceptionButton" size="m">
        {i18n.ACTION_ADD_EXCEPTION}
      </EuiText>
    </EuiContextMenuItem>
  ) : null;
};

export const AddException = React.memo(AddExceptionComponent);
