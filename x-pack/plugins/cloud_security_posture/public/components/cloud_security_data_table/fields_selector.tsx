/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo } from 'react';
import {
  EuiBasicTableColumn,
  EuiButton,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSearchBarProps,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { type DataView } from '@kbn/data-views-plugin/common';

interface Field {
  id: string;
  name: string;
  displayName: string;
}

export interface FieldsSelectorCommonProps {
  dataView: DataView;
  columns: string[];
  onAddColumn: (column: string) => void;
  onRemoveColumn: (column: string) => void;
}

const ACTION_COLUMN_WIDTH = '24px';
const defaultSorting = {
  sort: {
    field: 'name',
    direction: 'asc',
  },
} as const;

export const FieldsSelectorTable = ({
  title,
  dataView,
  columns,
  onAddColumn,
  onRemoveColumn,
}: FieldsSelectorCommonProps & {
  title: string;
}) => {
  const dataViewFields = useMemo<Field[]>(() => {
    return dataView.fields
      .getAll()
      .filter((field) => {
        return field.name !== '@timestamp' && field.name !== '_index' && field.visualizable;
      })
      .map((field) => ({
        id: field.name,
        name: field.name,
        displayName: field.customLabel || '',
      }));
  }, [dataView.fields]);

  const [fields, setFields] = useState(dataViewFields);

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

  const [fieldsSelected, setFieldsSelected] = useState<string[]>(columns);

  const tableColumns: Array<EuiBasicTableColumn<Field>> = [
    {
      field: 'action',
      name: '',
      width: ACTION_COLUMN_WIDTH,
      sortable: false,
      render: (_, { id }: Field) => {
        return (
          <EuiCheckbox
            checked={fieldsSelected.includes(id)}
            id={id}
            onChange={(e) => {
              const isChecked = e.target.checked;
              setFieldsSelected(
                isChecked ? [...fieldsSelected, id] : fieldsSelected.filter((f) => f !== id)
              );
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
      </EuiFlexGroup>
    );
  }, [fields.length]);

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

export const FieldsSelectorModal = ({
  closeModal,
  dataView,
  columns,
  onAddColumn,
  onRemoveColumn,
}: FieldsSelectorCommonProps & {
  closeModal: () => void;
}) => {
  const title = i18n.translate('xpack.csp.dataTable.fieldsModalTitle', {
    defaultMessage: 'Fields',
  });

  return (
    <EuiModal onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <FieldsSelectorTable
          title={title}
          dataView={dataView}
          columns={columns}
          onAddColumn={onAddColumn}
          onRemoveColumn={onRemoveColumn}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton onClick={closeModal} fill>
          Close
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
