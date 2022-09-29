/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiIcon, useEuiTheme } from '@elastic/eui';
import { TooltipWrapper } from '..';
import type { BucketContainerProps } from './types';

export const FieldsBucketContainer = ({
  idx,
  onRemoveClick,
  removeTitle,
  children,
  draggableProvided,
  isNotRemovable,
  isNotDraggable,
  'data-test-subj': dataTestSubj = 'lns-fieldsBucketContainer',
}: BucketContainerProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup // Possible to detect isDragging state here?
      direction={'row'}
      gutterSize="s"
      alignItems="center"
      responsive={false}
      data-test-subj={dataTestSubj}
    >
      <EuiFlexItem grow={false} {...(draggableProvided?.dragHandleProps ?? {})}>
        <TooltipWrapper
          tooltipContent={i18n.translate('xpack.lens.fieldsBucketContainer.dragHandleDisabled', {
            defaultMessage: 'Reordering requires more than one field to be defined.',
          })}
          condition={isNotDraggable ?? true}
        >
          <EuiIcon
            size="s"
            color={euiTheme.colors[isNotDraggable ? 'disabled' : 'text']}
            type="grab"
            aria-label={i18n.translate('xpack.lens.fieldsBucketContainer.dragToReorder', {
              defaultMessage: 'Drag to reorder',
            })}
            data-test-subj={`${dataTestSubj}-dragToReorder-${idx}`}
          />
        </TooltipWrapper>
      </EuiFlexItem>
      <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
        {children}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <TooltipWrapper
          tooltipContent={i18n.translate('xpack.lens.fieldsBucketContainer.deleteButtonDisabled', {
            defaultMessage: 'A minimum of one field must be defined.',
          })}
          condition={isNotRemovable ?? false}
        >
          <EuiButtonIcon
            iconType="trash"
            color="danger"
            aria-label={removeTitle}
            onClick={onRemoveClick}
            data-test-subj={`${dataTestSubj}-removeField-${idx}`}
            isDisabled={isNotRemovable}
          />
        </TooltipWrapper>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
