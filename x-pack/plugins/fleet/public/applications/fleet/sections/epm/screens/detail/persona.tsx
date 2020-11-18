/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAvatar, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React, { CSSProperties, memo, useCallback } from 'react';
import { EuiAvatarProps } from '@elastic/eui/src/components/avatar/avatar';

const MIN_WIDTH: CSSProperties = { minWidth: 0 };

/**
 * Components shows a link for a given value along with a revision number to its right. The display
 * value is truncated if it is longer than the width of where it is displayed, while the revision
 * always remain visible
 */
export const Persona = memo<EuiAvatarProps>(
  ({ name, className, 'data-test-subj': dataTestSubj, title, ...otherAvatarProps }) => {
    const getTestId = useCallback(
      (suffix) => {
        if (dataTestSubj) {
          return `${dataTestSubj}-${suffix}`;
        }
      },
      [dataTestSubj]
    );
    return (
      <EuiFlexGroup
        gutterSize="s"
        alignItems="baseline"
        style={MIN_WIDTH}
        className={className}
        data-test-subj={dataTestSubj}
        title={title}
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiAvatar name={name} data-test-subj={getTestId('avatar')} {...otherAvatarProps} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} className="eui-textTruncate">
          <EuiText size="s" className="eui-textTruncate" data-test-subj={getTestId('name')}>
            {name}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
