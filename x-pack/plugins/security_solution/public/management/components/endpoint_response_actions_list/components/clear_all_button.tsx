/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { EuiButtonEmpty } from '@elastic/eui';
import { UX_MESSAGES } from '../translations';

const StyledEuiButtonEmpty = euiStyled(EuiButtonEmpty).attrs({
  iconType: 'crossInACircleFilled',
  color: 'danger',
})`
  border-top: ${(props) => `${props.theme.eui.euiBorderThin}`};
  border-radius : 0;
`;
export const ClearAllButton = memo(
  ({
    'data-test-subj': dataTestSubj,
    isDisabled,
    onClick,
  }: {
    'data-test-subj'?: string;
    isDisabled: boolean;
    onClick: () => void;
  }) => {
    return (
      <StyledEuiButtonEmpty data-test-subj={dataTestSubj} isDisabled={isDisabled} onClick={onClick}>
        {UX_MESSAGES.filterClearAll}
      </StyledEuiButtonEmpty>
    );
  }
);

ClearAllButton.displayName = 'ClearAllButton';
