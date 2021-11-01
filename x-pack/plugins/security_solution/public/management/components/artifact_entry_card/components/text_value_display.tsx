/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren, useMemo } from 'react';
import { CommonProps, EuiText } from '@elastic/eui';
import classNames from 'classnames';

export type TextValueDisplayProps = Pick<CommonProps, 'data-test-subj'> &
  PropsWithChildren<{
    bold?: boolean;
    truncate?: boolean;
    size?: 'xs' | 's' | 'm' | 'relative';
  }>;

/**
 * Common component for displaying consistent text across the card. Changes here could impact all of
 * display of values on the card
 */
export const TextValueDisplay = memo<TextValueDisplayProps>(
  ({ bold, truncate, size = 's', 'data-test-subj': dataTestSubj, children }) => {
    const cssClassNames = useMemo(() => {
      return classNames({
        'eui-textTruncate': truncate,
        'eui-textBreakWord': true,
      });
    }, [truncate]);

    return (
      <EuiText size={size} className={cssClassNames} data-test-subj={dataTestSubj}>
        {bold ? <strong>{children}</strong> : children}
      </EuiText>
    );
  }
);
TextValueDisplay.displayName = 'TextValueDisplay';
