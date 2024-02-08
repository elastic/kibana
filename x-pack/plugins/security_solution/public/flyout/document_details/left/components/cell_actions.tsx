/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { useLeftPanelContext } from '../context';
import { getSourcererScopeId } from '../../../../helpers';
import { useBasicDataFromDetailsData } from '../../../../timelines/components/side_panel/event_details/helpers';
import { SecurityCellActionType } from '../../../../actions/constants';
import {
  CellActionsMode,
  SecurityCellActions,
  SecurityCellActionsTrigger,
} from '../../../../common/components/cell_actions';

interface CellActionsProps {
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
   * React components to render
   */
  children: React.ReactNode | string;
}

/**
 * Security cell action wrapper for document details flyout
 */
export const CellActions: FC<CellActionsProps> = ({ field, value, isObjectArray, children }) => {
  const { dataFormattedForFieldBrowser, scopeId, isPreview } = useLeftPanelContext();
  const { isAlert } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);

  const triggerId = isAlert
    ? SecurityCellActionsTrigger.DETAILS_FLYOUT
    : SecurityCellActionsTrigger.DEFAULT;

  const data = useMemo(() => ({ field, value }), [field, value]);
  const metadata = useMemo(() => ({ scopeId, isObjectArray }), [scopeId, isObjectArray]);
  const disabledActionTypes = useMemo(
    () => (isPreview ? [SecurityCellActionType.FILTER, SecurityCellActionType.TOGGLE_COLUMN] : []),
    [isPreview]
  );

  return (
    <SecurityCellActions
      data={data}
      mode={CellActionsMode.HOVER_RIGHT}
      triggerId={triggerId}
      visibleCellActions={6}
      sourcererScopeId={getSourcererScopeId(scopeId)}
      metadata={metadata}
      disabledActionTypes={disabledActionTypes}
    >
      {children}
    </SecurityCellActions>
  );
};

CellActions.displayName = 'CellActions';
