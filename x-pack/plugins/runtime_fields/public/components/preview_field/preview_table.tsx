/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiTable,
  EuiTableHeader,
  EuiTableBody,
  EuiTableHeaderCell,
  EuiTableRowCell,
  EuiTableRow,
  EuiComboBox,
  EuiPopover,
  EuiButtonIcon,
  EuiButtonEmpty,
} from '@elastic/eui';

import { RuntimeField, ComboBoxOption } from '../../types';
import { SearchResult, Document } from './preview_field';

interface Props {
  runtimeField?: RuntimeField;
  searchResult: SearchResult;
  selectedFields: string[];
  removeSelectedField: (name: string) => void;
}

const MAX_DOCS_PREVIEW = 10;

export const PreviewTable = React.memo(
  ({ searchResult, runtimeField, selectedFields, removeSelectedField }: Props) => {
    const [selectedColumn, setSelectedColumn] = useState<number | undefined>();

    // const canAddMoreField = selectedFields.length < searchResult.fieldNames.length;

    const columns = selectedFields.map((field) => {
      return {
        field,
        name: field,
        sortable: true,
        truncateText: false,
        isSortable: true,
      };
    });

    // const availableFields: Array<ComboBoxOption<string>> = searchResult.fieldNames
    //   .filter((name) => !selectedFields.includes(name))
    //   .map((name) => {
    //     return {
    //       label: name,
    //       value: name,
    //     };
    //   });

    const renderHeaderCells = () => {
      const headers: JSX.Element[] = [];

      columns.forEach((column, columnIndex) => {
        headers.push(
          <EuiTableHeaderCell
            key={`${columnIndex}-${column}`}
            // onSort={column.isSortable ? onSort(column.id) : undefined}
            // isSorted={this.state.sortedColumn === column.id}
            // isSortAscending={this.sortableProperties.isAscendingByName(column.id)}
            // mobileOptions={column.mobileOptions}
          >
            {columnIndex === 0 ? (
              column.name
            ) : (
              <EuiPopover
                ownFocus
                button={
                  <EuiButtonEmpty onClick={() => setSelectedColumn(columnIndex)}>
                    {column.name}
                  </EuiButtonEmpty>
                }
                isOpen={selectedColumn === columnIndex}
                closePopover={() => setSelectedColumn(undefined)}
                anchorPosition="upCenter"
              >
                <EuiButtonIcon
                  onClick={() => {
                    removeSelectedField(column.name);
                    setSelectedColumn(undefined);
                  }}
                  iconType="cross"
                  aria-label="Remove field"
                />
              </EuiPopover>
            )}
          </EuiTableHeaderCell>
        );
      });

      // const addField = (
      //   <EuiTableHeaderCell key={`${columns.length}-addFieldButton`} width={200}>
      //     <EuiComboBox<string>
      //       placeholder={i18n.translate(
      //         'xpack.runtimeFields.editor.previewField.addFieldPlaceholderLabel',
      //         {
      //           defaultMessage: 'Add a field',
      //         }
      //       )}
      //       singleSelection={{ asPlainText: true }}
      //       options={availableFields}
      //       selectedOptions={undefined}
      //       onChange={(newValue) => {
      //         if (newValue.length === 0) {
      //           // Don't allow clearing the type. One must always be selected
      //           return;
      //         }

      //         setSelectedFields((prev) => [...prev, newValue[0].value!]);
      //       }}
      //       isClearable={false}
      //       aria-label={i18n.translate('xpack.runtimeFields.editor.previewField.addFieldAriaLabel', {
      //         defaultMessage: 'Add field',
      //       })}
      //       style={{ width: '184px' }}
      //     />
      //   </EuiTableHeaderCell>
      // );

      return headers.length ? headers : null;
      // return headers.length ? (canAddMoreField ? [...headers, addField] : headers) : null;
    };

    const renderRow = (doc: Document) => {
      const cells = columns.map((column) => {
        const cellValue = doc.fields[column.name]
          .map((value) => {
            if (typeof value === 'string') {
              return value;
            }
            return JSON.stringify(value);
          })
          .join(', ');
        // const renderedValue =
        //   typeof cellValue === 'string' ? cellValue : <EuiCode>{JSON.stringify(cellValue)}</EuiCode>;
        // const textOnly = typeof cellValue === 'string';

        return (
          <EuiTableRowCell key={column.name} truncateText={false} textOnly={false}>
            {cellValue}
          </EuiTableRowCell>
        );
      });

      const cellsWithEmptyLastCell = [...cells, <EuiTableRowCell key="emptyCell" />];

      return (
        <EuiTableRow
          key={doc.uuid}
          // isSelected={this.isItemSelected(item.id)}
          isSelectable={false}
          hasActions={false}
        >
          {cellsWithEmptyLastCell}
        </EuiTableRow>
      );
    };

    const renderRows = () => {
      const rows = [];

      for (
        let itemIndex = 0;
        itemIndex < Math.min(MAX_DOCS_PREVIEW, searchResult.documents.length);
        itemIndex++
      ) {
        rows.push(renderRow(searchResult.documents[itemIndex]));
      }

      return rows;
    };

    return runtimeField ? (
      <div style={{ overflowX: 'auto' }}>
        <EuiTable
          id="preview-runtime-fields"
          responsive={false}
          style={{ width: 'auto', minWidth: '100%' }}
        >
          <EuiTableHeader>{renderHeaderCells()}</EuiTableHeader>

          <EuiTableBody>{renderRows()}</EuiTableBody>
        </EuiTable>
      </div>
    ) : (
      // <EuiBasicTable items={searchResult.documents} columns={columns} tableLayout="auto" />
      <div>Info call out. Complete the form to preview the field.</div>
    );
  }
);

// const columns = [
//   {
//     field: 'firstName',
//     name: 'First Name',
//     sortable: true,
//     truncateText: true,
//     mobileOptions: {
//       render: (item) => (
//         <span>
//           {item.firstName} {item.lastName}
//         </span>
//       ),
//       header: false,
//       truncateText: false,
//       enlarge: true,
//       fullWidth: true,
//     },
//   },
//   {
//     field: 'lastName',
//     name: 'Last Name',
//     sortable: true,
//     truncateText: true,
//     mobileOptions: {
//       show: false,
//     },
//   },
//   {
//     field: 'github',
//     name: (
//       <EuiToolTip content="Their mascot is the Octokitty">
//         <span>
//           Github{' '}
//           <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
//         </span>
//       </EuiToolTip>
//     ),
//     sortable: true,
//     render: (username) => (
//       <EuiLink href={`https://github.com/${username}`} target="_blank">
//         {username}
//       </EuiLink>
//     ),
//   },
//   {
//     field: 'dateOfBirth',
//     name: (
//       <EuiToolTip content="Colloquially known as a 'birthday'">
//         <span>
//           Date of Birth{' '}
//           <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
//         </span>
//       </EuiToolTip>
//     ),
//     schema: 'date',
//     render: (date) => formatDate(date, 'dobLong'),
//     sortable: true,
//   },
//   {
//     field: 'nationality',
//     name: (
//       <EuiToolTip content="The nation in which this person resides">
//         <span>
//           Nationality{' '}
//           <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
//         </span>
//       </EuiToolTip>
//     ),
//     sortable: true,
//     render: (countryCode) => {
//       const country = store.getCountry(countryCode);
//       return `${country.flag} ${country.name}`;
//     },
//   },
//   {
//     field: 'online',
//     name: (
//       <EuiToolTip content="Free to talk or busy with business">
//         <span>
//           Online{' '}
//           <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
//         </span>
//       </EuiToolTip>
//     ),
//     schema: 'boolean',
//     sortable: true,
//     render: (online) => {
//       const color = online ? 'success' : 'danger';
//       const label = online ? 'Online' : 'Offline';
//       return <EuiHealth color={color}>{label}</EuiHealth>;
//     },
//   },
// ];
