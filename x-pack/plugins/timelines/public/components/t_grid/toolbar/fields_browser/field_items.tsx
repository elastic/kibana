/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCheckbox,
  EuiIcon,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiScreenReaderOnly,
  EuiHealth,
  EuiBadge,
  EuiBasicTableColumn,
  EuiLink,
} from '@elastic/eui';
import { Action } from '@elastic/eui/src/components/basic_table/action_types';
import { uniqBy } from 'lodash/fp';
import styled from 'styled-components';

import { getEmptyValue } from '../../../empty_value';
import { getExampleText, getIconFromType } from '../../../utils/helpers';
import type { BrowserField, BrowserFields } from '../../../../../common/search_strategy';
import type { ColumnHeaderOptions } from '../../../../../common/types';
import { defaultColumnHeaderType } from '../../body/column_headers/default_headers';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../body/constants';
import { TruncatableText } from '../../../truncatable_text';
import { FieldName } from './field_name';
import * as i18n from './translations';
import { getAlertColumnHeader } from './helpers';
import { arrayIndexToAriaIndex } from '../../../../../common/utils/accessibility';
import { FieldTableColumns } from './types';

const TypeIcon = styled(EuiIcon)`
  margin: 0 4px;
  position: relative;
  top: -1px;
`;
TypeIcon.displayName = 'TypeIcon';

export const Description = styled.span`
  user-select: text;
  width: 350px;
`;
Description.displayName = 'Description';

/**
 * An item rendered in the table
 */
export interface FieldItem {
  name: string;
  type?: string;
  description?: string;
  example?: string;
  category: string;
  selected: boolean;
  isRuntime: boolean;
  highlight?: string;
  ariaRowindex?: number;
}

/**
 * Returns the field items of all categories selected
 */
export const getFieldItems = ({
  browserFields,
  selectedCategoryIds,
  columnHeaders,
}: {
  browserFields: BrowserFields;
  selectedCategoryIds: string[];
  columnHeaders: ColumnHeaderOptions[];
}): FieldItem[] => {
  const categoryIds =
    selectedCategoryIds.length > 0 ? selectedCategoryIds : Object.keys(browserFields);
  const selectedFieldIds = new Set(columnHeaders.map(({ id }) => id));

  return uniqBy(
    'name',
    categoryIds.reduce<FieldItem[]>((fieldItems, categoryId) => {
      const categoryBrowserFields = Object.values(browserFields[categoryId]?.fields ?? {});
      if (categoryBrowserFields.length > 0) {
        fieldItems.push(
          ...getCategoryFieldItems({
            browserFields: categoryBrowserFields,
            category: categoryId,
            selectedFieldIds,
          })
        );
      }
      return fieldItems;
    }, [])
  );
};

/**
 * Returns the fields items of a category
 */
const getCategoryFieldItems = ({
  browserFields,
  category,
  selectedFieldIds,
}: {
  browserFields: Array<Partial<BrowserField>>;
  category: string;
  selectedFieldIds: Set<string>;
}): FieldItem[] => {
  return browserFields.map(({ name = '', ...field }, index) => ({
    name,
    type: field.type,
    description: field.description ?? '',
    example: field.example?.toString(),
    category,
    selected: selectedFieldIds.has(name),
    isRuntime: !!field.runtimeField,
    ariaRowindex: arrayIndexToAriaIndex(index),
  }));
};

/**
 * Returns the column header for a field
 */
export const getColumnHeader = (timelineId: string, fieldName: string): ColumnHeaderOptions => ({
  columnHeaderType: defaultColumnHeaderType,
  id: fieldName,
  initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
  ...getAlertColumnHeader(timelineId, fieldName),
});

// export const getSelectedFieldItems = ({
//   columnHeaders,
//   browserFields,
//   selectedCategoryIds = [],
// }: {
//   columnHeaders: ColumnHeaderOptions[];
//   browserFields: BrowserFields;
//   selectedCategoryIds: string[];
// }): FieldItem[] => {
//   const columnsSet = new Set(columnHeaders.map(({ id }) => id));
//   const categoryIds =
//     selectedCategoryIds.length > 0 ? selectedCategoryIds : Object.keys(browserFields);

//   return categoryIds.reduce<FieldItem[]>((fieldItems, categoryId) => {
//     const categoryBrowserFields = Object.values(browserFields[categoryId]?.fields ?? {});
//     const selectedCategoryBrowserFields = categoryBrowserFields.filter((categoryBrowserField) =>
//       columnsSet.has(categoryBrowserField.name ?? '')
//     );
//     if (selectedCategoryBrowserFields.length > 0) {
//       fieldItems.push(
//         ...getCategoryFieldItems({
//           category: categoryId,
//           browserFields: selectedCategoryBrowserFields,
//         })
//       );
//     }
//     return fieldItems;
//   }, []);
// };

// /**
//  * Returns the fields items, values, and descriptions shown when a user expands an event
//  */
// export const _getFieldItems = ({
//   category,
//   columnHeaders,
//   highlight = '',
//   timelineId,
//   toggleColumn,
// }: {
//   category: Partial<BrowserField>;
//   columnHeaders: ColumnHeaderOptions[];
//   highlight?: string;
//   timelineId: string;
//   toggleColumn: (column: ColumnHeaderOptions) => void;
// }): any[] =>
//   uniqBy('name', [
//     ...Object.values(category != null && category.fields != null ? category.fields : {}),
//   ]).map((field) => ({
//     checkbox: (
//       <EuiToolTip content={i18n.VIEW_COLUMN(field.name ?? '')}>
//         <EuiCheckbox
//           aria-label={i18n.VIEW_COLUMN(field.name ?? '')}
//           checked={columnHeaders.findIndex((c) => c.id === field.name) !== -1}
//           data-test-subj={`field-${field.name}-checkbox`}
//           data-colindex={1}
//           id={field.name ?? ''}
//           onChange={() =>
//             toggleColumn({
//               columnHeaderType: defaultColumnHeaderType,
//               id: field.name ?? '',
//               initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
//               ...getAlertColumnHeader(timelineId, field.name ?? ''),
//             })
//           }
//         />
//       </EuiToolTip>
//     ),
//     field: (
//       <EuiFlexGroup alignItems="center" gutterSize="none">
//         <EuiFlexItem grow={false}>
//           <EuiToolTip content={field.type}>
//             <TypeIcon
//               data-test-subj={`field-${field.name}-icon`}
//               type={getIconFromType(field.type ?? null)}
//             />
//           </EuiToolTip>
//         </EuiFlexItem>

//         <EuiFlexItem grow={false}>
//           <FieldName data-test-subj="field-name" fieldId={field.name ?? ''} highlight={highlight} />
//         </EuiFlexItem>
//       </EuiFlexGroup>
//     ),
//     description: (
//       <div data-colindex={3} tabIndex={0}>
//         <EuiToolTip content={field.description}>
//           <>
//             <EuiScreenReaderOnly data-test-subj="descriptionForScreenReaderOnly">
//               <p>{i18n.DESCRIPTION_FOR_FIELD(field.name ?? '')}</p>
//             </EuiScreenReaderOnly>
//             <TruncatableText>
//               <Description data-test-subj={`field-${field.name}-description`}>
//                 {`${field.description ?? getEmptyValue()} ${getExampleText(field.example)}`}
//               </Description>
//             </TruncatableText>
//           </>
//         </EuiToolTip>
//       </div>
//     ),
//     fieldId: field.name ?? '',
//   }));

const onDeleteRuntimeField = (fieldItem: FieldItem) => {
  console.log('delete', { fieldItem });
};
const onEditRuntimeField = (fieldItem: FieldItem) => {
  console.log('edit', { fieldItem });
};

const actions: Array<Action<FieldItem>> = [
  {
    name: 'Delete',
    description: 'Delete runtime field',
    icon: 'trash',
    color: 'danger',
    type: 'icon',
    onClick: onDeleteRuntimeField,
    isPrimary: true,
    available: ({ isRuntime }) => isRuntime,
    'data-test-subj': 'action-delete-runtime-field',
  },
  {
    name: 'Edit',
    isPrimary: true,
    description: 'Edit runtime field',
    icon: 'pencil',
    type: 'icon',
    available: ({ isRuntime }) => isRuntime,
    onClick: onEditRuntimeField,
    'data-test-subj': 'action-edit-runtime-field',
  },
];

/**
 * Returns a table column template provided to the `EuiInMemoryTable`'s
 * `columns` prop
 */
export const getFieldColumns = ({
  highlight = '',
  onToggleColumn,
  fieldTableColumns,
}: {
  highlight: string;
  onToggleColumn: (id: string) => void;
  fieldTableColumns: FieldTableColumns;
}): FieldTableColumns => [
  {
    field: 'selected',
    name: '',
    render: (selected: boolean, { name }) => (
      <EuiToolTip content={i18n.VIEW_COLUMN(name)}>
        <EuiCheckbox
          aria-label={i18n.VIEW_COLUMN(name)}
          checked={selected}
          data-test-subj={`field-${name}-checkbox`}
          data-colindex={1}
          id={name}
          onChange={() => onToggleColumn(name)}
        />
      </EuiToolTip>
    ),
    sortable: false,
    width: '25px',
  },
  {
    field: 'name',
    name: i18n.NAME,
    dataType: 'string',
    render: (name: string, item: FieldItem) => {
      return (
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiToolTip content={item.type}>
              <TypeIcon
                data-test-subj={`field-${name}-icon`}
                type={getIconFromType(item.type ?? null)}
              />
            </EuiToolTip>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <FieldName data-test-subj="field-name" fieldId={name} highlight={highlight} />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
    sortable: true,
    width: '120px',
  },
  ...fieldTableColumns,
  {
    field: 'name',
    name: 'Reference',
    render: (name, item) => {
      const field = name.replaceAll('.', '-').replace('@', '');
      return !item.isRuntime && !name.startsWith('_') ? (
        <EuiToolTip content="ECS Field Reference">
          <EuiLink
            href={`https://www.elastic.co/guide/en/ecs/current/ecs-${item.category}.html#field-${field}`}
            target="_blank"
          />
        </EuiToolTip>
      ) : null;
    },
    sortable: false,
    width: '80px',
  },
  {
    field: 'description',
    name: i18n.DESCRIPTION,
    render: (description, item) => (
      <EuiToolTip content={description}>
        <>
          <EuiScreenReaderOnly data-test-subj="descriptionForScreenReaderOnly">
            <p>{i18n.DESCRIPTION_FOR_FIELD(item.name ?? '')}</p>
          </EuiScreenReaderOnly>
          <TruncatableText>
            <Description data-test-subj={`field-${item.name}-description`}>
              {`${description ?? getEmptyValue()} ${getExampleText(item.example)}`}
            </Description>
          </TruncatableText>
        </>
      </EuiToolTip>
    ),
    sortable: true,
    width: '350px',
  },
  {
    field: 'isRuntime',
    name: i18n.RUNTIME,
    dataType: 'boolean',
    render: (isRuntime: boolean) =>
      isRuntime ? <EuiHealth color="success" title={i18n.RUNTIME_FIELD} /> : null,
    sortable: true,
    width: '80px',
  },
  {
    field: 'category',
    name: i18n.CATEGORY,
    dataType: 'string',
    render: (category: string) => <EuiBadge>{category}</EuiBadge>,
    sortable: true,
    width: '100px',
  },
  {
    name: 'Actions',
    actions,
    width: '50px',
  },
];
