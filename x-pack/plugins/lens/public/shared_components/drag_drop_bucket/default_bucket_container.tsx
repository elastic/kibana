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
import { TooltipWrapper } from '../tooltip_wrapper';

export const DefaultBucketContainer = ({
  idx,
  isInvalid,
  invalidMessage,
  onRemoveClick,
  removeTitle,
  children,
  draggableProvided,
  isNotRemovable,
  isNotDraggable,
  'data-test-subj': dataTestSubj = 'lns-customBucketContainer',
}: BucketContainerProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      paddingSize="none"
      hasShadow={false}
      hasBorder={true}
      data-test-subj={dataTestSubj}
      style={{ padding: '0 ' + euiTheme.size.xs }}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false} {...(draggableProvided?.dragHandleProps ?? {})}>
          <TooltipWrapper
            tooltipContent={i18n.translate('xpack.lens.fieldsBucketContainer.dragHandleDisabled', {
              defaultMessage: 'Reordering requires more than one item.',
            })}
            condition={isNotDraggable ?? true}
          >
            <EuiIcon
              size="s"
              color={
                euiTheme.colors[isInvalid ? 'danger' : isNotDraggable ? 'disabled' : 'subduedText']
              }
              type={isInvalid ? 'alert' : 'grab'}
              aria-label={
                isInvalid
                  ? invalidMessage
                  : i18n.translate('xpack.lens.customBucketContainer.dragToReorder', {
                      defaultMessage: 'Drag to reorder',
                    })
              }
              data-test-subj={`${dataTestSubj}-dragToReorder-${idx}`}
            />
          </TooltipWrapper>
        </EuiFlexItem>
        <EuiFlexItem grow={true}>{children}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <TooltipWrapper
            tooltipContent={i18n.translate(
              'xpack.lens.fieldsBucketContainer.deleteButtonDisabled',
              {
                defaultMessage: 'A minimum of one item is required.',
              }
            )}
            condition={isNotRemovable ?? false}
          >
            <EuiButtonIcon
              iconSize="s"
              iconType="trash"
              color="danger"
              onClick={onRemoveClick}
              aria-label={removeTitle}
              disabled={isNotRemovable}
              data-test-subj={`${dataTestSubj}-remove-${idx}`}
            />
          </TooltipWrapper>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
