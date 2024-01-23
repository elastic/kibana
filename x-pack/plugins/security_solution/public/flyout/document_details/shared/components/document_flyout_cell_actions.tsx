/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import type { RightPanelContext } from '../../right/context';
import type { LeftPanelContext } from '../../left/context';
import { getSourcererScopeId } from '../../../../helpers';
import { useBasicDataFromDetailsData } from '../../../../timelines/components/side_panel/event_details/helpers';
import { SecurityCellActionType } from '../../../../actions/constants';
import {
  CellActionsMode,
  SecurityCellActions,
  SecurityCellActionsTrigger,
} from '../../../../common/components/cell_actions';

interface DocumentFlyoutCellActionsProps {
  /**
   * Field name
   */
  field: string;
  /**
   * Field value
   */
  value: string[] | string | null | undefined;
  /**
   * Boolean to indicate if value is an object array
   */
  isObjectArray?: boolean;
  /**
   * Flyout contexts
   */
  useContext: () => RightPanelContext | LeftPanelContext;
  /**
   * React components to render
   */
  children: React.ReactNode | string;
}

/**
 * Security cell action wrapper for document details flyout
 */
export const DocumentFlyoutCellActions: FC<DocumentFlyoutCellActionsProps> = memo(
  ({ field, value, isObjectArray, useContext, children }) => {
    const { dataFormattedForFieldBrowser, scopeId, isPreview } = useContext();
    const { isAlert } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);

    const triggerId = isAlert
      ? SecurityCellActionsTrigger.DETAILS_FLYOUT
      : SecurityCellActionsTrigger.DEFAULT;

    return (
      <SecurityCellActions
        data={{ field, value }}
        mode={CellActionsMode.HOVER_RIGHT}
        triggerId={triggerId}
        visibleCellActions={6}
        sourcererScopeId={getSourcererScopeId(scopeId)}
        metadata={{ scopeId, isObjectArray }}
        disabledActionTypes={
          isPreview ? [SecurityCellActionType.FILTER, SecurityCellActionType.TOGGLE_COLUMN] : []
        }
      >
        {children}
      </SecurityCellActions>
    );
  }
);

DocumentFlyoutCellActions.displayName = 'DocumentFlyoutCellActions';
