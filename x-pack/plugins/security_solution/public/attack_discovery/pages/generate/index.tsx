/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import React from 'react';

import * as i18n from '../empty_prompt/translations';

interface Props {
  isDisabled?: boolean;
  isLoading: boolean;
  onGenerate: () => void;
}

const GenerateComponent: React.FC<Props> = ({ isLoading, isDisabled = false, onGenerate }) => {
  const disabled = isLoading || isDisabled;

  return (
    <EuiToolTip
      content={disabled ? i18n.SELECT_A_CONNECTOR : null}
      data-test-subj="generateTooltip"
    >
      <EuiButton color="primary" data-test-subj="generate" disabled={disabled} onClick={onGenerate}>
        {i18n.GENERATE}
      </EuiButton>
    </EuiToolTip>
  );
};

GenerateComponent.displayName = 'Generate';

export const Generate = React.memo(GenerateComponent);
