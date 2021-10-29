/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren, useMemo } from 'react';
import { EuiText, EuiToolTip } from '@elastic/eui';
import classNames from 'classnames';
import { getEmptyValue } from '../../../../common/components/empty_value';

export type TextValueDisplayProps = PropsWithChildren<{
  bold?: boolean;
  truncate?: boolean;
  size?: 'xs' | 's' | 'm' | 'relative';
  withTooltip?: boolean;
}>;

/**
 * Common component for displaying consistent text across the card. Changes here could impact all of
 * display of values on the card
 */
export const TextValueDisplay = memo<TextValueDisplayProps>(
  ({ bold, truncate, size = 's', withTooltip = false, children }) => {
    const cssClassNames = useMemo(() => {
      return classNames({
        'eui-textTruncate': truncate,
      });
    }, [truncate]);

    const textContent = useMemo(() => {
      return bold ? <strong>{children}</strong> : children;
    }, [bold, children]);

    return (
      <EuiText size={size} className={cssClassNames}>
        {withTooltip &&
        'string' === typeof children &&
        children.length > 0 &&
        children !== getEmptyValue() ? (
          <EuiToolTip content={children} position="top">
            <>{textContent}</>
          </EuiToolTip>
        ) : (
          textContent
        )}
      </EuiText>
    );
  }
);
TextValueDisplay.displayName = 'TextValueDisplay';
