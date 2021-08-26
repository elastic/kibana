/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton } from '@elastic/eui';
import { EuiButtonPropsForButton } from '@elastic/eui/src/components/button/button';

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

const strings = {
  getWorkpadCreateButtonLabel: () =>
    i18n.translate('xpack.canvas.workpadCreate.createButtonLabel', {
      defaultMessage: 'Create workpad',
    }),
};
