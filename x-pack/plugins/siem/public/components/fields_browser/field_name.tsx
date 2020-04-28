/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiHighlight, EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useContext, useState, useMemo } from 'react';
import styled from 'styled-components';

import { ColumnHeaderOptions } from '../../store/timeline/model';
import { OnUpdateColumns } from '../timeline/events';
import { TimelineContext } from '../timeline/timeline_context';
import { WithHoverActions } from '../with_hover_actions';
import { LoadingSpinner } from './helpers';
import * as i18n from './translations';
import { DraggableWrapperHoverContent } from '../drag_and_drop/draggable_wrapper_hover_content';

/**
 * The name of a (draggable) field
 */
export const FieldNameContainer = styled.span`
  border-radius: 4px;
  padding: 0 4px 0 8px;
  position: relative;

  &::before {
    background-image: linear-gradient(
        135deg,
        ${({ theme }) => theme.eui.euiColorMediumShade} 25%,
        transparent 25%
      ),
      linear-gradient(-135deg, ${({ theme }) => theme.eui.euiColorMediumShade} 25%, transparent 25%),
      linear-gradient(135deg, transparent 75%, ${({ theme }) => theme.eui.euiColorMediumShade} 75%),
      linear-gradient(-135deg, transparent 75%, ${({ theme }) => theme.eui.euiColorMediumShade} 75%);
    background-position: 0 0, 1px 0, 1px -1px, 0px 1px;
    background-size: 2px 2px;
    bottom: 2px;
    content: '';
    display: block;
    left: 2px;
    position: absolute;
    top: 2px;
    width: 4px;
  }

  &:hover,
  &:focus {
    transition: background-color 0.7s ease;
    background-color: #000;
    color: #fff;

    &::before {
      background-image: linear-gradient(135deg, #fff 25%, transparent 25%),
        linear-gradient(
          -135deg,
          ${({ theme }) => theme.eui.euiColorLightestShade} 25%,
          transparent 25%
        ),
        linear-gradient(
          135deg,
          transparent 75%,
          ${({ theme }) => theme.eui.euiColorLightestShade} 75%
        ),
        linear-gradient(
          -135deg,
          transparent 75%,
          ${({ theme }) => theme.eui.euiColorLightestShade} 75%
        );
    }
  }
`;

FieldNameContainer.displayName = 'FieldNameContainer';

const ViewCategoryIcon = styled(EuiIcon)`
  margin-left: 5px;
`;

ViewCategoryIcon.displayName = 'ViewCategoryIcon';

interface ToolTipProps {
  categoryId: string;
  onUpdateColumns: OnUpdateColumns;
  categoryColumns: ColumnHeaderOptions[];
}

const ViewCategory = React.memo<ToolTipProps>(
  ({ categoryId, onUpdateColumns, categoryColumns }) => {
    const { isLoading } = useContext(TimelineContext);
    return (
      <EuiToolTip content={i18n.VIEW_CATEGORY(categoryId)}>
        {!isLoading ? (
          <EuiButtonIcon
            aria-label={i18n.VIEW_CATEGORY(categoryId)}
            color="text"
            data-test-subj="view-category"
            onClick={() => {
              onUpdateColumns(categoryColumns);
            }}
            iconType="visTable"
          />
        ) : (
          <LoadingSpinner size="m" />
        )}
      </EuiToolTip>
    );
  }
);

ViewCategory.displayName = 'ViewCategory';

/** Renders a field name in it's non-dragging state */
export const FieldName = React.memo<{
  categoryId: string;
  categoryColumns: ColumnHeaderOptions[];
  fieldId: string;
  highlight?: string;
  onUpdateColumns: OnUpdateColumns;
}>(({ fieldId, highlight = '' }) => {
  const [showTopN, setShowTopN] = useState<boolean>(false);
  const toggleTopN = useCallback(() => {
    setShowTopN(!showTopN);
  }, [setShowTopN, showTopN]);

  const hoverContent = useMemo(
    () => (
      <DraggableWrapperHoverContent field={fieldId} showTopN={showTopN} toggleTopN={toggleTopN} />
    ),
    [fieldId, showTopN, toggleTopN]
  );

  const render = useCallback(
    () => (
      <EuiText size="xs">
        <FieldNameContainer>
          <EuiHighlight data-test-subj={`field-name-${fieldId}`} search={highlight}>
            {fieldId}
          </EuiHighlight>
        </FieldNameContainer>
      </EuiText>
    ),
    [fieldId, highlight]
  );

  return <WithHoverActions hoverContent={hoverContent} render={render} />;
});

FieldName.displayName = 'FieldName';
