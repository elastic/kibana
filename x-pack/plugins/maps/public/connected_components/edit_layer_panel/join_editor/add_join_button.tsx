/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';

export interface Props {
  disabledReason: string;
  isDisabled: boolean;
  label: string;
  onClick: () => void;
}

export function AddJoinButton(props: Props) {
  const button = (
    <EuiButtonEmpty
      onClick={props.onClick}
      size="xs"
      iconType="plusInCircleFilled"
      aria-label={props.label}
      isDisabled={props.isDisabled}
    >
      {props.label}
    </EuiButtonEmpty>
  );

  return props.isDisabled ? (
    <EuiToolTip content={props.disabledReason}>{button}</EuiToolTip>
  ) : (
    button
  );
}
