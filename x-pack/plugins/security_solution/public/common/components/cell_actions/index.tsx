/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CellActions, useDataGridColumnsCellActions } from '@kbn/cell-actions';
import type {
  CellActionsProps,
  UseDataGridColumnsCellActions,
  UseDataGridColumnsCellActionsProps,
} from '@kbn/cell-actions';
import React, { useMemo } from 'react';
import type { CellActionFieldValue, CellActionsData } from '@kbn/cell-actions/src/types';
import type { SecurityMetadata } from '../../../actions/types';
import { SecurityCellActionsTrigger, SecurityCellActionType } from '../../../actions/constants';
import { getSelectedDataviewSelector } from '../../store/sourcerer/selectors';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { SourcererScopeName } from '../../store/sourcerer/model';

// bridge exports for convenience
export * from '@kbn/cell-actions';
export { SecurityCellActionsTrigger, SecurityCellActionType };

export interface SecurityCellActionsData {
  /**
   * The field name
   */
  field: string;

  value: CellActionFieldValue;
}

export interface SecurityCellActionsProps
  extends Omit<CellActionsProps, 'data' | 'metadata' | 'disabledActionTypes' | 'triggerId'> {
  scopeId?: SourcererScopeName;
  data: SecurityCellActionsData | SecurityCellActionsData[];

  triggerId: SecurityCellActionsTrigger; // can not use SecurityCellActionsTrigger, React.FC Validation throws error for some reason
  disabledActionTypes?: SecurityCellActionType[];
  metadata?: SecurityMetadata;
}

export interface UseDataGridColumnsSecurityCellActionsProps
  extends UseDataGridColumnsCellActionsProps {
  triggerId: SecurityCellActionsTrigger;
  disabledActionTypes?: SecurityCellActionType[];
  metadata?: SecurityMetadata;
}

// same components with security cell actions types
// export const SecurityCellActions: React.FC<SecurityCellActionsProps> = CellActions;
export const useDataGridColumnsSecurityCellActions: UseDataGridColumnsCellActions<UseDataGridColumnsSecurityCellActionsProps> =
  useDataGridColumnsCellActions;

export const SecurityCellActions: React.FC<SecurityCellActionsProps> = ({
  scopeId = SourcererScopeName.default,
  data,
  ...props
}) => {
  const getFieldSpec = useGetFieldSpec(scopeId);
  // not a great dependency may cause rerenders whe it is an object
  const dataArray = useMemo(() => (Array.isArray(data) ? data : [data]), [data]);

  const fieldData: CellActionsData[] = useMemo(
    () =>
      dataArray
        .map(({ field, value }) => ({
          field: getFieldSpec(field),
          value,
        }))
        .filter((item): item is CellActionsData => !!item.field),
    [dataArray, getFieldSpec]
  );

  return fieldData.length > 0 ? <CellActions data={fieldData} {...props} /> : <>{props.children}</>;
};

const selectedDataviewSelector = getSelectedDataviewSelector();

const useGetFieldSpec = (scopeId: SourcererScopeName) => {
  const dataView = useDeepEqualSelector((state) => selectedDataviewSelector(state, scopeId));
  return (fieldName: string) => {
    const fields = dataView?.fields;
    return fields && fields[fieldName];
  };
};
