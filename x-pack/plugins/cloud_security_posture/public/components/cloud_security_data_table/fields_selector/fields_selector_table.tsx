/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTableColumn,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiInMemoryTable,
  EuiPopover,
  EuiSearchBarProps,
  EuiText,
} from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

const ACTION_COLUMN_WIDTH = '24px';
const defaultSorting = {
  sort: {
    field: 'name',
    direction: 'asc',
  },
} as const;

interface Field {
  id: string;
  name: string;
  displayName: string;
}

const VIEW_LABEL = i18n.translate('xpack.csp.dataTable.fieldsModal.viewLabel', {
  defaultMessage: 'View',
});

const VIEW_VALUE_SELECTED = i18n.translate('xpack.csp.dataTable.fieldsModal.viewSelected', {
  defaultMessage: 'selected',
});

const VIEW_VALUE_ALL = i18n.translate('xpack.csp.dataTable.fieldsModal.viewAll', {
  defaultMessage: 'all',
});

export interface FieldsSelectorTableProps {
  dataView: DataView;
  columns: string[];
  onAddColumn: (column: string) => void;
  onRemoveColumn: (column: string) => void;
  title: string;
  onFilterSelectedChange: (enabled: boolean) => void;
  isFilterSelectedEnabled: boolean;
}

function getDataViewFields(dataView: DataView) {
  return dataView.fields
    .getAll()
    .filter((field) => field.name !== '_index' && field.visualizable)
    .map((field) => ({
      id: field.name,
      name: field.name,
      displayName: field.customLabel || '',
    }));
}

export const FieldsSelectorTable = ({
  title,
  dataView,
  columns,
  onAddColumn,
  onRemoveColumn,
  isFilterSelectedEnabled,
  onFilterSelectedChange,
}: FieldsSelectorTableProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const dataViewFields = useMemo<Field[]>(() => getDataViewFields(dataView), [dataView]);

  const [fields, setFields] = useState(
    !isFilterSelectedEnabled
      ? dataViewFields
      : dataViewFields.filter((field) => columns.includes(field.id))
  );

  // useEffect(() => {
  //   if (isFilterSelectedEnabled) {
  //     const filteredItems = dataViewFields.filter((field) => {
  //       return columns.includes(field.id);
  //     });
  //     setFields(filteredItems);
  //   } else {
  //     setFields(dataViewFields);
  //   }
  // }, [columns, dataViewFields, isFilterSelectedEnabled]);

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((open) => !open);
  }, []);
  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);
  let debounceTimeoutId: ReturnType<typeof setTimeout>;

  const onQueryChange: EuiSearchBarProps['onChange'] = ({ query }) => {
    clearTimeout(debounceTimeoutId);

    debounceTimeoutId = setTimeout(() => {
      const filteredItems = dataViewFields.filter((field) => {
        const normalizedName = `${field.name} ${field.displayName}`.toLowerCase();
        const normalizedQuery = query?.text.toLowerCase() || '';
        return normalizedName.indexOf(normalizedQuery) !== -1;
      });

      setFields(filteredItems);
    }, 300);
  };

  const tableColumns: Array<EuiBasicTableColumn<Field>> = [
    {
      field: 'action',
      name: '',
      width: ACTION_COLUMN_WIDTH,
      sortable: false,
      render: (_, { id }: Field) => {
        return (
          <EuiCheckbox
            checked={columns.includes(id)}
            id={`cloud-security-fields-selector-item-${id}`}
            data-test-subj={`cloud-security-fields-selector-item-${id}`}
            onChange={(e) => {
              const isChecked = e.target.checked;
              return isChecked ? onAddColumn(id) : onRemoveColumn(id);
            }}
          />
        );
      },
    },
    {
      field: 'name',
      name: i18n.translate('xpack.csp.dataTable.fieldsModalName', {
        defaultMessage: 'Name',
      }),
      sortable: true,
    },
    {
      field: 'displayName',
      name: i18n.translate('xpack.csp.dataTable.fieldsModalCustomLabel', {
        defaultMessage: 'Custom Label',
      }),
      sortable: (field: Field) => field.displayName.toLowerCase(),
    },
  ];

  const error = useMemo(() => {
    if (!dataView || dataView.fields.length === 0) {
      return i18n.translate('xpack.csp.dataTable.fieldsModalError', {
        defaultMessage: 'No fields found in the data view',
      });
    }
    return '';
  }, [dataView]);

  const search: EuiSearchBarProps = {
    onChange: onQueryChange,
    box: {
      incremental: true,
      placeholder: i18n.translate('xpack.csp.dataTable.fieldsModalSearch', {
        defaultMessage: 'Search field name',
      }),
    },
  };

  const tableHeader = useMemo(() => {
    const totalFields = fields.length;
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText data-test-subj="csp:dataTable:fieldsModal:fieldsShowing" size="xs">
            <FormattedMessage
              id="xpack.csp.dataTable.fieldsModalFieldsShowing"
              defaultMessage="Showing"
            />{' '}
            <strong data-test-subj="csp:dataTable:fieldsModal:fieldsCount">{totalFields}</strong>{' '}
            <FormattedMessage
              id="xpack.csp.dataTable.fieldsModalFieldsCount"
              defaultMessage="{totalFields, plural, one {field} other {fields}}"
              values={{
                totalFields,
              }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            panelPaddingSize="none"
            anchorPosition="downRight"
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            button={
              <EuiButtonEmpty
                data-test-subj="viewSelectorButton"
                size="xs"
                iconType="arrowDown"
                iconSide="right"
                onClick={togglePopover}
              >
                {`${VIEW_LABEL}: ${isFilterSelectedEnabled ? VIEW_VALUE_SELECTED : VIEW_VALUE_ALL}`}
              </EuiButtonEmpty>
            }
          >
            <EuiContextMenuPanel
              data-test-subj="viewSelectorMenu"
              size="s"
              items={[
                <EuiContextMenuItem
                  data-test-subj="viewSelectorOption-all"
                  key="viewAll"
                  icon={isFilterSelectedEnabled ? 'empty' : 'check'}
                  onClick={() => {
                    onFilterSelectedChange(false);
                    closePopover();
                  }}
                >
                  {`${VIEW_LABEL} ${VIEW_VALUE_ALL}`}
                </EuiContextMenuItem>,
                <EuiHorizontalRule key="separator" margin="none" />,
                <EuiContextMenuItem
                  data-test-subj="viewSelectorOption-selected"
                  key="viewSelected"
                  icon={isFilterSelectedEnabled ? 'check' : 'empty'}
                  onClick={() => {
                    onFilterSelectedChange(true);
                    closePopover();
                  }}
                >
                  {`${VIEW_LABEL} ${VIEW_VALUE_SELECTED}`}
                </EuiContextMenuItem>,
              ]}
            />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [
    closePopover,
    fields.length,
    isFilterSelectedEnabled,
    isPopoverOpen,
    onFilterSelectedChange,
    togglePopover,
  ]);

  return (
    <EuiInMemoryTable
      tableCaption={title}
      items={fields}
      columns={tableColumns}
      search={search}
      pagination
      sorting={defaultSorting}
      error={error}
      childrenBetween={tableHeader}
    />
  );
};
