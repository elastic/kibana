/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type EuiDataGridColumn,
  type EuiDataGridProps,
  EuiDataGrid,
  EuiSpacer,
  EuiFlexGroup,
} from '@elastic/eui';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type {
  BrowserField,
  BrowserFields,
} from '@kbn/timelines-plugin/common/search_strategy/index_fields';
import get from 'lodash/get';
import React, { type FC, useMemo, useState, useCallback, useContext } from 'react';
import styled from 'styled-components';
import type { EventFieldsData } from '../../../common/components/event_details/types';
import { getSourcererScopeId } from '../../../helpers';
import {
  CellActionsMode,
  SecurityCellActions,
  SecurityCellActionsTrigger,
} from '../../../common/components/cell_actions';
import { FieldNameCell } from '../../../common/components/event_details/table/field_name_cell';
import { FieldValueCell } from '../../../common/components/event_details/table/field_value_cell';
import { SearchInput } from './search_input';

export interface FieldsGridProps {
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  eventId: string;
  scopeId: string;
  'data-test-subj'?: string;
}

type FieldsGridContextValue = FieldsGridProps;

const FieldsGridDataContext = React.createContext<FieldsGridContextValue | undefined>(undefined);

const FieldsGridDataProvider: FC<FieldsGridContextValue> = ({
  children,
  data,
  eventId,
  scopeId,
  browserFields,
  'data-test-subj': testSubjectId,
}) => {
  const value = useMemo(
    () => ({ data, eventId, scopeId, browserFields, 'data-test-subj': testSubjectId }),
    [browserFields, data, eventId, scopeId, testSubjectId]
  );

  return <FieldsGridDataContext.Provider value={value}>{children}</FieldsGridDataContext.Provider>;
};

const useGridDataContext = () => {
  const gridDataContext = useContext(FieldsGridDataContext);

  if (!gridDataContext) {
    throw new Error('useGridDataContext must be used within a FieldsGridDataProvider');
  }

  return gridDataContext;
};

const columns: EuiDataGridColumn[] = [
  {
    id: 'field',
    displayAsText: 'Field',
    isSortable: true,
    actions: {
      showHide: false,
    },
  },
  {
    id: 'values',
    displayAsText: 'Value',
    isSortable: true,
    visibleCellActions: 3,
    cellActions: [
      ({ rowIndex }) => {
        const { data, scopeId } = useGridDataContext();

        const row = data[rowIndex];

        const actionsData = useMemo(
          () => ({
            field: row.field,
            value: row.values,
          }),
          [row.field, row.values]
        );

        return (
          <SecurityCellActions
            data={actionsData}
            triggerId={SecurityCellActionsTrigger.DETAILS_FLYOUT}
            mode={CellActionsMode.INLINE}
            visibleCellActions={3}
            sourcererScopeId={getSourcererScopeId(scopeId)}
            metadata={{ scopeId, isObjectArray: row.isObjectArray }}
          />
        );
      },
    ],
  },
];

const CellRendererComponent: EuiDataGridProps['renderCellValue'] = ({ rowIndex, columnId }) => {
  const {
    data,
    scopeId,
    eventId,
    browserFields,
    'data-test-subj': testSubjectId,
  } = useGridDataContext();

  const row = data[rowIndex] as unknown as EventFieldsData;

  const getLinkValue = (field: string) => {
    return '';
  };

  const fieldsCategory = get(browserFields, `${row.category}.fields`, {}) as Record<
    string,
    BrowserField
  >;
  const fieldFromBrowserField = (fieldsCategory[row.field] || {}) as BrowserField;

  switch (columnId) {
    case 'field':
      return (
        <EuiFlexGroup
          gutterSize="xs"
          alignItems="center"
          data-test-subj={`${testSubjectId}-${row.field}-field`}
        >
          <FieldNameCell data={fieldFromBrowserField} field={row.field} fieldMapping={undefined} />
        </EuiFlexGroup>
      );
    case 'values':
      return (
        <FieldValueCell
          contextId={scopeId}
          data={row}
          eventId={eventId}
          fieldFromBrowserField={fieldFromBrowserField}
          getLinkValue={getLinkValue}
          isDraggable={false}
          values={row.values}
        />
      );

    default:
      return '';
  }
};

const visibleColumns: string[] = columns.map(({ id }) => id);

const columnVisibility = {
  visibleColumns,
  setVisibleColumns: () => {},
} as const;

const pageSizeOptions = [25, 50, 100];

const gridStyle = {
  border: 'horizontal',
  header: 'shade',
} as const;

const StyledEuiDataGrid = styled(EuiDataGrid)`
  .euiDataGridHeaderCell {
    pointer-events: none;
    background-color: transparent;
    border: none;

    & svg {
      display: none;
    }
  }

  .euiDataGridRowCell {
    font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
    font-family: ${({ theme }) => theme.eui.euiCodeFontFamily};
  }

  .euiDataGridRowCell__expandFlex {
    align-items: center;
  }
`;

const sortFields = (fields: TimelineEventsDetailsItem[]) => {
  const temp = [...fields];

  temp.sort((a, b) => a.field.localeCompare(b.field));

  return temp;
};

export const FieldsGrid: FC<FieldsGridProps> = ({
  browserFields,
  data,
  eventId,
  scopeId,
  'data-test-subj': testSubjectId,
  ...rest
}) => {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: pageSizeOptions[0] });
  const setPageIndex = useCallback(
    (pageIndex) => setPagination((currentPagination) => ({ ...currentPagination, pageIndex })),
    []
  );
  const setPageSize = useCallback(
    (pageSize) =>
      setPagination((currentPagination) => ({
        ...currentPagination,
        pageSize,
        pageIndex: 0,
      })),
    []
  );

  const paginationOptions = useMemo(
    () => ({
      ...pagination,
      onChangeItemsPerPage: setPageSize,
      onChangePage: setPageIndex,
      pageSizeOptions,
    }),
    [pagination, setPageIndex, setPageSize]
  );

  const [dataToRender, setDataToRender] = useState(() => sortFields(data));

  const handleSearch = useCallback(
    (searchValue) => {
      const sortedData = sortFields(data);

      // If no filter is applied, show all data
      if (!searchValue) {
        setDataToRender([...sortedData]);
        return;
      }

      const filteredData: TimelineEventsDetailsItem[] = sortedData.filter((item) => {
        const valuesAndFieldName = [
          ...(Array.isArray(item.values) ? item.values : []),
          item.field,
        ].join('|');

        return valuesAndFieldName.toLowerCase().includes(searchValue.toLowerCase());
      });

      setDataToRender(filteredData);
    },
    [data]
  );

  return (
    <>
      <SearchInput onChange={handleSearch} data-test-subj={`${testSubjectId}-searchInput`} />
      <EuiSpacer size="m" />
      <FieldsGridDataProvider
        browserFields={browserFields}
        data={dataToRender}
        eventId={eventId}
        scopeId={scopeId}
        data-test-subj={testSubjectId}
      >
        <StyledEuiDataGrid
          gridStyle={gridStyle}
          toolbarVisibility={false}
          columns={columns}
          columnVisibility={columnVisibility}
          rowCount={dataToRender.length}
          renderCellValue={CellRendererComponent}
          pagination={paginationOptions}
          aria-labelledby="Fields grid"
          data-test-subj={testSubjectId}
        />
      </FieldsGridDataProvider>
    </>
  );
};
