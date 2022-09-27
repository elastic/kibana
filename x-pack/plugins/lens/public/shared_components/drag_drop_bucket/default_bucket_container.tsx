/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  useEuiTheme,
} from '@elastic/eui';
import type { BucketContainerProps } from './types';

export const DefaultBucketContainer = ({
  isInvalid,
  invalidMessage,
  onRemoveClick,
  removeTitle,
  children,
  draggableProvided,
  isNotRemovable,
  isNotDraggable,
  'data-test-subj': dataTestSubj,
}: BucketContainerProps) => {
  const { euiTheme } = useEuiTheme();

  let color = euiTheme.colors.subduedText;
  if (isNotDraggable) {
    color = euiTheme.colors.disabled;
  } else if (isInvalid) {
    color = euiTheme.colors.danger;
  }

  return (
    <EuiPanel paddingSize="none" data-test-subj={dataTestSubj} hasShadow={false} hasBorder>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiPanel paddingSize="xs" color="transparent" {...draggableProvided.dragHandleProps}>
            <EuiIcon
              size="s"
              color={color}
              type={isInvalid ? 'alert' : 'grab'}
              title={
                isInvalid
                  ? invalidMessage
                  : i18n.translate('xpack.lens.customBucketContainer.dragToReorder', {
                      defaultMessage: 'Drag to reorder',
                    })
              }
              data-test-subj={`${dataTestSubj}-dragToReorder`}
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={true}>{children}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconSize="s"
            iconType="cross"
            color="danger"
            onClick={onRemoveClick}
            aria-label={removeTitle}
            title={removeTitle}
            disabled={isNotRemovable}
            data-test-subj={`${dataTestSubj}-remove`}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
