/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem, EuiText } from '@elastic/eui';
import React from 'react';
import * as i18n from '../translations';

interface AddEndpointExceptionProps {
  onClick: () => void;
  disabled?: boolean;
}

const AddEndpointExceptionComponent: React.FC<AddEndpointExceptionProps> = ({
  onClick,
  disabled,
}) => {
  return (
    <EuiContextMenuItem
      key="add-endpoint-exception-menu-item"
      aria-label={i18n.ACTION_ADD_ENDPOINT_EXCEPTION}
      data-test-subj="add-endpoint-exception-menu-item"
      id="addEndpointException"
      onClick={onClick}
      disabled={disabled}
    >
      <EuiText size="m">{i18n.ACTION_ADD_ENDPOINT_EXCEPTION}</EuiText>
    </EuiContextMenuItem>
  );
};

export const AddEndpointException = React.memo(AddEndpointExceptionComponent);
