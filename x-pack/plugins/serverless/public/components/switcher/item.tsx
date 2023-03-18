/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, type EuiIconProps } from '@elastic/eui';

interface ItemProps extends Pick<EuiIconProps, 'type'> {
  label: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}

export const SwitcherItem = ({ type, label, onClick }: ItemProps) => (
  <EuiButtonEmpty type="submit" iconType={type} onClick={onClick} flush="left">
    {label}
  </EuiButtonEmpty>
);
