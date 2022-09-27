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
import { TooltipWrapper } from '..';
import type { BucketContainerProps } from './types';

export const FieldsBucketContainer = ({
  onRemoveClick,
  removeTitle,
  children,
  draggableProvided,
  isNotRemovable,
  isNotDraggable,
  'data-test-subj': dataTestSubj,
}: BucketContainerProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      paddingSize="xs"
      hasShadow={false}
      hasBorder={false}
      color="transparent"
      data-test-subj={dataTestSubj}
    >
      <EuiFlexGroup direction={'row'} gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiPanel paddingSize="none" color="transparent" {...draggableProvided.dragHandleProps}>
            <EuiIcon
              size="s"
              color={isNotDraggable ? euiTheme.colors.disabled : 'subdued'}
              type="grab"
              title={i18n.translate('xpack.lens.fieldsBucketContainer.dragToReorder', {
                defaultMessage: 'Drag to reorder',
              })}
              data-test-subj={`${dataTestSubj}-dragToReorder`}
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <div>{children}</div>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <TooltipWrapper
            tooltipContent={i18n.translate(
              'xpack.lens.fieldsBucketContainer.deleteButtonDisabled',
              {
                defaultMessage: 'This function requires a minimum of one field defined',
              }
            )}
            condition={isNotRemovable ?? false}
          >
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              aria-label={removeTitle}
              title={removeTitle}
              onClick={onRemoveClick}
              data-test-subj={`${dataTestSubj}-remove`}
              isDisabled={isNotRemovable}
            />
          </TooltipWrapper>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
