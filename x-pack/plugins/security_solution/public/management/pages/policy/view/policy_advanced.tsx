/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  EuiFieldText,
  EuiText,
  EuiIconTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { cloneDeep } from 'lodash';
import { policyConfig } from '../store/policy_details/selectors';
import { usePolicyDetailsSelector } from './policy_hooks';

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

export const PolicyAdvanced = React.memo(
  ({
    configPath,
    firstSupportedVersion,
    lastSupportedVersion,
  }: {
    configPath: string[];
    firstSupportedVersion: string;
    lastSupportedVersion?: string;
  }) => {
    const dispatch = useDispatch();
    const policyDetailsConfig = usePolicyDetailsSelector(policyConfig);
    const onChange = useCallback(
      (event) => {
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
      [dispatch, policyDetailsConfig, configPath]
    );

    const value =
      policyDetailsConfig &&
      getValue((policyDetailsConfig as unknown) as Record<string, unknown>, configPath);

    return (
      <>
        <EuiFlexItem>
          <h1>
            <FormattedMessage
              id="xpack.securitySolution.policyAdvanced.field"
              defaultMessage={configPath.join('.')}
            />
          </h1>
        </EuiFlexItem>
        <EuiFlexItem>
          <h1>
            <FormattedMessage
              id="xpack.securitySolution.policyAdvanced.version"
              defaultMessage={
                lastSupportedVersion
                  ? `${firstSupportedVersion}-${lastSupportedVersion}`
                  : `${firstSupportedVersion}+`
              }
            />
          </h1>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFieldText value={value as string} onChange={onChange} />
        </EuiFlexItem>
      </>
    );
  }
);

// export const PolicyAdvanced = React.memo(() => {
//   const dispatch = useDispatch();
//   const policyDetailsConfig = usePolicyDetailsSelector(policyConfig);

//   const onChange = useCallback(
//     (configPath: string[]) => (event) => {
//       if (policyDetailsConfig) {
//         const newPayload = cloneDeep(policyDetailsConfig);

//         setValue(
//           (newPayload as unknown) as Record<string, unknown>,
//           event.target.value,
//           configPath
//         );
//         dispatch({
//           type: 'userChangedPolicyConfig',
//           payload: { policyConfig: newPayload },
//         });
//         //event.target.focus();
//       }
//     },
//     [dispatch, policyDetailsConfig]
//   );

// const rawData = [];
// const columns = [
//   {
//     id: 'Field name',
//   },
//   {
//     id: 'Supported endpoint version',
//   },
//   {
//     id: 'Value',
//     // rowCellRender: function RowCellRender() {
//     //   const [isPopoverOpen, setIsPopoverOpen] = useState(false);
//     //   return (

//     //   );
//     // },
//   },
// ];

// ((AdvancedPolicySchema as unknown) as AdvancedPolicySchemaType[]).map((advancedField, index) => {
//   const configPath = advancedField.key.split('.');

//   const value =
//     policyDetailsConfig &&
//     getValue((policyDetailsConfig as unknown) as Record<string, unknown>, configPath);

// const [isPopoverOpen, setIsPopoverOpen] = useState(false);
// // console.log(configPath, value);
// return rawData.push({
//   'Field name': advancedField.key,
//   'Supported endpoint version': advancedField.last_supported_version
//     ? `${advancedField.first_supported_version}-${advancedField.last_supported_version}`
//     : `${advancedField.first_supported_version}+`,
//   Value: /*<EuiFieldText value={value as string} onChange={onChange(configPath)}/>,*/
//   <EuiPopover
//   isOpen={isPopoverOpen}
//   anchorPosition="upCenter"
//   button={
//     <EuiButtonIcon
//       aria-label="show actions"
//       iconType="boxesHorizontal"
//       color="text"
//       onClick={() => setIsPopoverOpen(!isPopoverOpen)}
//     />
//   }
//   closePopover={() => setIsPopoverOpen(false)}
//   ownFocus={true}>
// <EuiFieldText value={value as string} onChange={onChange(configPath)}/>
// </EuiPopover>
// });
// });

// Column visibility
// const [visibleColumns, setVisibleColumns] = useState(() => columns.map(({ id }) => id)); // initialize to the full set of columns

// const renderCellValue = useMemo(() => {
//   return ({ rowIndex, columnId, setCellProps }) => {
//     // eslint-disable-next-line react-hooks/rules-of-hooks
//     useEffect(() => {
//       if (columnId === 'Value') {
//         // if (rawData.hasOwnProperty(rowIndex)) {
//         setCellProps({
//           style: {
//             backgroundColor: '#fffcdd',
//           },
//         });
//         // }
//       }
//     }, [rowIndex, columnId, setCellProps]);

//     return Object.prototype.hasOwnProperty.call(rawData, rowIndex)
//       ? rawData[rowIndex][columnId]
//       : null;
//   };
// }, [rawData]);

//   return (
//     <EuiDataGrid
//       aria-label="Advanced policy data grid"
//       columns={columns}
//       columnVisibility={{ visibleColumns, setVisibleColumns }}
//       // trailingControlColumns={trailingControlColumns}
//       rowCount={rawData.length}
//       renderCellValue={renderCellValue}
//       // inMemory={{ level: 'sorting' }}
//       // sorting={{ columns: sortingColumns, onSort }}
//       // pagination={{
//       //   ...pagination,
//       //   pageSizeOptions: [10, 50, 100],
//       //   onChangeItemsPerPage: onChangeItemsPerPage,
//       //   onChangePage: onChangePage,
//       // }}
//       onColumnResize={(eventData) => {
//         // console.log(eventData);
//       }}
//     />
//   );
// });

PolicyAdvanced.displayName = 'PolicyAdvanced';
