/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { EuiButtonPropsForButton } from '@elastic/eui/src/components/button/button';
import { ComponentStrings } from '../../../i18n';

const { WorkpadCreate: strings } = ComponentStrings;

export interface Props
  extends Omit<EuiButtonPropsForButton, 'iconType' | 'fill' | 'data-test-subj' | 'children'> {
  canUserWrite: boolean;
}

export const WorkpadCreate = ({ canUserWrite, disabled, ...rest }: Props) => {
  return (
    <EuiButton
      {...{ ...rest }}
      iconType="plusInCircleFilled"
      fill
      disabled={!canUserWrite && !disabled}
      data-test-subj="create-workpad-button"
    >
      {strings.getWorkpadCreateButtonLabel()}
    </EuiButton>
  );
};
