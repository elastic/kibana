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
import { SourcererScopeName } from '../../store/sourcerer/model';
import { useGetFieldSpec } from '../../hooks/use_get_field_spec';
import { useDataViewId } from '../../hooks/use_data_view_id';

// bridge exports for convenience
export * from '@kbn/cell-actions';
export { SecurityCellActionsTrigger, SecurityCellActionType };

export interface SecurityCellActionsData {
  /**
   * The field name is necessary to fetch the FieldSpec from the Dataview.
   * Ex: `event.category`
   */
  field: string;

  value: CellActionFieldValue;
}

export interface SecurityCellActionsProps
  extends Omit<CellActionsProps, 'data' | 'metadata' | 'disabledActionTypes' | 'triggerId'> {
  sourcererScopeId?: SourcererScopeName;
  data: SecurityCellActionsData | SecurityCellActionsData[];
  triggerId: SecurityCellActionsTrigger;
  disabledActionTypes?: SecurityCellActionType[];
  metadata?: SecurityMetadata;
}

export interface UseDataGridColumnsSecurityCellActionsProps
  extends UseDataGridColumnsCellActionsProps {
  triggerId: SecurityCellActionsTrigger;
  disabledActionTypes?: SecurityCellActionType[];
  metadata?: SecurityMetadata;
}

export const useDataGridColumnsSecurityCellActions: UseDataGridColumnsCellActions<UseDataGridColumnsSecurityCellActionsProps> =
  useDataGridColumnsCellActions;

export const SecurityCellActions: React.FC<SecurityCellActionsProps> = ({
  sourcererScopeId = SourcererScopeName.default,
  data,
  metadata,
  children,
  ...props
}) => {
  const getFieldSpec = useGetFieldSpec(sourcererScopeId);
  const dataViewId = useDataViewId(sourcererScopeId);
  // Make a dependency key to prevent unnecessary re-renders when data object is defined inline
  // It is necessary because the data object is an array or an object and useMemo would always re-render
  const dependencyKey = JSON.stringify(data);

  const fieldData: CellActionsData[] = useMemo(
    () =>
      (Array.isArray(data) ? data : [data])
        .map(({ field, value }) => ({
          field: getFieldSpec(field),
          value,
        }))
        .filter((item): item is CellActionsData => !!item.field),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Use the dependencyKey to prevent unnecessary re-renders
    [dependencyKey, getFieldSpec]
  );

  const metadataWithDataView = useMemo(() => ({ ...metadata, dataViewId }), [dataViewId, metadata]);

  return fieldData.length > 0 ? (
    <CellActions data={fieldData} metadata={metadataWithDataView} {...props}>
      {children}
    </CellActions>
  ) : (
    <>{children}</>
  );
};
