/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { EuiFieldText, EuiDataGrid } from '@elastic/eui';
import { cloneDeep } from 'lodash';
import { policyConfig } from '../store/policy_details/selectors';
import { usePolicyDetailsSelector } from './policy_hooks';
import * as AdvancedPolicySchema from '../../../../../schema.json';

function setValue(obj: Record<string, unknown>, value: string, path: string[]) {
  let newPolicyConfig = obj;
  for (let i = 0; i < path.length - 1; i++) {
    newPolicyConfig = newPolicyConfig[path[i]] as Record<string, unknown>;
  }
  newPolicyConfig[path[path.length - 1]] = value;
}

function getValue(obj: Record<string, unknown>, path: string[]) {
  let currentPolicyConfig = obj;

  for (let i = 0; i < path.length - 1; i++) {
    currentPolicyConfig = currentPolicyConfig[path[i]] as Record<string, unknown>;
  }
  return currentPolicyConfig[path[path.length - 1]];
}

interface AdvancedPolicySchemaType {
  key: string;
  first_supported_version: string;
  last_supported_version: string;
}

export const PolicyAdvanced = React.memo(() => {
  const dispatch = useDispatch();
  const policyDetailsConfig = usePolicyDetailsSelector(policyConfig);

  const onChange = useCallback(
    (configPath: string[]) => (event) => {
      if (policyDetailsConfig) {
        const newPayload = cloneDeep(policyDetailsConfig);

        setValue(
          (newPayload as unknown) as Record<string, unknown>,
          event.target.value,
          configPath
        );
        dispatch({
          type: 'userChangedPolicyConfig',
          payload: { policyConfig: newPayload },
        });
      }
    },
    [dispatch, policyDetailsConfig]
  );

  const rawData = [];
  const columns = [
    {
      id: 'Field name',
    },
    {
      id: 'Supported endpoint version',
    },
    {
      id: 'Value',
    },
  ];

  ((AdvancedPolicySchema as unknown) as AdvancedPolicySchemaType[]).map((advancedField, index) => {
    const configPath = advancedField.key.split('.');

    const value =
      policyDetailsConfig &&
      getValue((policyDetailsConfig as unknown) as Record<string, unknown>, configPath);

    // console.log(configPath, value);
    return rawData.push({
      'Field name': advancedField.key,
      'Supported endpoint version': advancedField.last_supported_version
        ? `${advancedField.first_supported_version}-${advancedField.last_supported_version}`
        : `${advancedField.first_supported_version}+`,
      Value: <EuiFieldText value={value as string} onChange={onChange(configPath)} />,
    });
  });

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState(() => columns.map(({ id }) => id)); // initialize to the full set of columns

  const renderCellValue = useMemo(() => {
    return ({ rowIndex, columnId, setCellProps }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(() => {
        if (columnId === 'Value') {
          // if (rawData.hasOwnProperty(rowIndex)) {
          setCellProps({
            style: {
              backgroundColor: '#fffcdd',
            },
          });
          // }
        }
      }, [rowIndex, columnId, setCellProps]);

      return Object.prototype.hasOwnProperty.call(rawData, rowIndex)
        ? rawData[rowIndex][columnId]
        : null;
    };
  }, [rawData]);

  return (
    <EuiDataGrid
      aria-label="Advanced policy data grid"
      columns={columns}
      columnVisibility={{ visibleColumns, setVisibleColumns }}
      // trailingControlColumns={trailingControlColumns}
      rowCount={rawData.length}
      renderCellValue={renderCellValue}
      // inMemory={{ level: 'sorting' }}
      // sorting={{ columns: sortingColumns, onSort }}
      // pagination={{
      //   ...pagination,
      //   pageSizeOptions: [10, 50, 100],
      //   onChangeItemsPerPage: onChangeItemsPerPage,
      //   onChangePage: onChangePage,
      // }}
      onColumnResize={(eventData) => {
        // console.log(eventData);
      }}
    />
  );
});

PolicyAdvanced.displayName = 'PolicyAdvanced';
