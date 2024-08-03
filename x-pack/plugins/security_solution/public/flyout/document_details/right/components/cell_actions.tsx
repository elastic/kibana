/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { useDocumentDetailsContext } from '../../shared/context';
import { FlyoutCellActions } from '../../../shared/components/flyout_cell_actions';

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
  const { scopeId, isPreview } = useDocumentDetailsContext();

  return (
    <FlyoutCellActions
      field={field}
      value={value}
      isObjectArray={isObjectArray}
      scopeId={scopeId}
      isPreview={isPreview}
    >
      {children}
    </FlyoutCellActions>
  );
};

CellActions.displayName = 'CellActions';
