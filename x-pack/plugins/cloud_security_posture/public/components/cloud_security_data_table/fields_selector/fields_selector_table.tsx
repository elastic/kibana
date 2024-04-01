/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';
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
import { SESSION_STORAGE_FIELDS_MODAL_SHOW_SELECTED } from '../../../common/constants';
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
}

function filterFieldsBySearch(
  dataView: DataView,
  columns: string[] = [],
  searchQuery?: string,
  isFilterSelectedEnabled: boolean = false
) {
  const dataViewFields = dataView.fields
    .getAll()
    .filter((field) => field.name !== '_index' && field.visualizable)
    .map((field) => ({
      id: field.name,
      name: field.name,
      displayName: field.customLabel || '',
    }));

  const visibleFields = !isFilterSelectedEnabled
    ? dataViewFields
    : dataViewFields.filter((field) => columns.includes(field.id));

  return !searchQuery
    ? visibleFields
    : visibleFields.filter((field) => {
        const normalizedName = `${field.name} ${field.displayName}`.toLowerCase();
        const normalizedQuery = searchQuery.toLowerCase() || '';
        return normalizedName.indexOf(normalizedQuery) !== -1;
      });
}

export const FieldsSelectorTable = ({
  title,
  dataView,
  columns,
  onAddColumn,
  onRemoveColumn,
}: FieldsSelectorTableProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string | undefined>();
  const [isFilterSelectedEnabled, setIsFilterSelectedEnabled] = useSessionStorage(
    SESSION_STORAGE_FIELDS_MODAL_SHOW_SELECTED,
    false
  );
  const fields = useMemo<Field[]>(
    () => filterFieldsBySearch(dataView, columns, searchQuery, isFilterSelectedEnabled),
    [dataView, columns, searchQuery, isFilterSelectedEnabled]
  );

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((open) => !open);
  }, []);
  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const onFilterSelectedChange = useCallback(
    (enabled: boolean) => {
      setIsFilterSelectedEnabled(enabled);
    },
    [setIsFilterSelectedEnabled]
  );

  let debounceTimeoutId: ReturnType<typeof setTimeout>;

  const onQueryChange: EuiSearchBarProps['onChange'] = ({ query }) => {
    clearTimeout(debounceTimeoutId);

    debounceTimeoutId = setTimeout(() => {
      setSearchQuery(query?.text);
    }, 300);
  };

  const tableColumns: Array<EuiBasicTableColumn<Field>> = [
    {
      field: 'action',
      name: '',
      width: ACTION_COLUMN_WIDTH,
      sortable: false,
      render: (_, { id }: Field) => (
        <EuiCheckbox
          checked={columns.includes(id)}
          id={`cloud-security-fields-selector-item-${id}`}
          data-test-subj={`cloud-security-fields-selector-item-${id}`}
          onChange={(e) => {
            const isChecked = e.target.checked;
            return isChecked ? onAddColumn(id) : onRemoveColumn(id);
          }}
        />
      ),
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
