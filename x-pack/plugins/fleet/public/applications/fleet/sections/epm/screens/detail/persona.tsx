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
 * Shows a user's name along with an avatar. Name is truncated if its wider than the availble space
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
