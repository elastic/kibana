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
    <EuiPanel paddingSize="none" hasShadow={false} hasBorder={true} data-test-subj={dataTestSubj}>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiPanel
            paddingSize="xs"
            style={isNotDraggable ? { cursor: 'no-drop' } : {}}
            color="transparent"
            {...(draggableProvided?.dragHandleProps ?? {})}
          >
            <TooltipWrapper
              tooltipContent={i18n.translate(
                'xpack.lens.fieldsBucketContainer.dragHandleDisabled',
                {
                  defaultMessage: 'Reordering requires more than one field to be defined.',
                }
              )}
              condition={isNotDraggable ?? true}
            >
              <EuiIcon
                size="s"
                color={
                  euiTheme.colors[
                    isInvalid ? 'danger' : isNotDraggable ? 'disabled' : 'subduedText'
                  ]
                }
                type={isInvalid ? 'alert' : 'grab'}
                title={
                  isInvalid
                    ? invalidMessage
                    : i18n.translate('xpack.lens.customBucketContainer.dragToReorder', {
                        defaultMessage: 'Drag to reorder',
                      })
                }
                data-test-subj={`${dataTestSubj}-dragToReorder-${idx}`}
              />
            </TooltipWrapper>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={true}>{children}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <TooltipWrapper
            tooltipContent={i18n.translate(
              'xpack.lens.fieldsBucketContainer.deleteButtonDisabled',
              {
                defaultMessage: 'A minimum of one field must be defined.',
              }
            )}
            condition={isNotRemovable ?? false}
          >
            <EuiButtonIcon
              iconSize="s"
              iconType="cross"
              color="danger"
              onClick={onRemoveClick}
              aria-label={removeTitle}
              title={removeTitle}
              disabled={isNotRemovable}
              data-test-subj={`${dataTestSubj}-remove-${idx}`}
              style={{ marginRight: euiTheme.size.xs }}
            />
          </TooltipWrapper>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
