/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { CommonProps, EuiButtonIconPropsForButton } from '@elastic/eui';
import { EuiButtonIcon } from '@elastic/eui';
import { COLLAPSE_ACTION, EXPAND_ACTION } from './translations';

export interface CardExpandButtonProps extends Pick<CommonProps, 'data-test-subj'> {
  expanded: boolean;
  onClick: EuiButtonIconPropsForButton['onClick'];
}

export const CardExpandButton = memo<CardExpandButtonProps>(
  ({ expanded, onClick, 'data-test-subj': dataTestSubj }) => {
    return (
      <EuiButtonIcon
        iconType={expanded ? 'arrowUp' : 'arrowDown'}
        onClick={onClick}
        data-test-subj={dataTestSubj}
        aria-label={expanded ? COLLAPSE_ACTION : EXPAND_ACTION}
      />
    );
  }
);
CardExpandButton.displayName = 'CardExpandButton';
