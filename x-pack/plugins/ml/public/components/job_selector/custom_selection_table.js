/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React, { Fragment, useState, useEffect } from 'react';
// import { PropTypes } from 'prop-types';
import {
  EuiCheckbox,
  EuiSearchBar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableHeaderCellCheckbox,
  EuiTablePagination,
  EuiTableRow,
  EuiTableRowCell,
  EuiTableRowCellCheckbox,
  EuiTableHeaderMobile,
} from '@elastic/eui';

import { Pager } from '@elastic/eui/lib/services';
import { loadGroups } from './job_selector';
// import { i18n } from '@kbn/i18n';


const JOBS_PER_PAGE = 20;

// function getError(error) {
//   if (error !== null) {
//     return i18n.translate('xpack.ml.jobSelector.filterBar.invalidSearchErrorMessage', {
//       defaultMessage: `Invalid search: {errorMessage}`,
//       values: { errorMessage: error.message },
//     });
//   }

//   return '';
// }

export function CustomSelectionTable({
  columns,
  filterDefaultFields,
  // filters,
  items,
  onTableChange,
  selectedIds,
  sortableProperties,
}) {
  const [itemIdToSelectedMap, setItemIdToSelectedMap] = useState(getCurrentlySelectedItemIdsMap());
  const [currentItems, setCurrentItems] = useState(items);
  const [sortedColumn, setSortedColumn] = useState('');
  const [pager, setPager] = useState();
  const [firstAndLastIndex, setFirstAndLastIndex] = useState({
    firstItemIndex: 0,
    lastItemIndex: 1
  });
  const [query, setQuery] = useState(EuiSearchBar.Query.MATCH_ALL);
  const [error, setError] = useState(null); // eslint-disable-line

  const filters = [
    {
      type: 'field_value_selection',
      field: 'groups',
      name: 'Group',
      loadingMessage: 'Loading...',
      noOptionsMessage: 'No groups found.',
      // name: i18n.translate({
      //   id: 'xpack.ml.jobSelector.filterBar.groupLabel',
      //   defaultMessage: 'Group'
      // }),
      multiSelect: 'or',
      cache: 10000,
      options: () => loadGroups()
    }
  ];

  useEffect(() => {
    setCurrentItems(items);
  }, [items]); // eslint-disable-line

  // When changes to selected ids made via badge removal - update selection in the table accordingly
  useEffect(() => {
    setItemIdToSelectedMap(getCurrentlySelectedItemIdsMap());
    // setCurrentItems(items);
  }, [selectedIds]); // eslint-disable-line

  useEffect(() => {
    const tablePager = new Pager(currentItems.length, JOBS_PER_PAGE);
    setFirstAndLastIndex({
      firstItemIndex: tablePager.getFirstItemIndex(),
      lastItemIndex: tablePager.getLastItemIndex()
    });
    setPager(tablePager);
  }, [currentItems]); // eslint-disable-line

  function getCurrentlySelectedItemIdsMap() {
    const selectedIdsMap = { 'all': false };
    selectedIds.forEach(id => { selectedIdsMap[id] = true; });
    return selectedIdsMap;
  }

  function handleTableChange({ isSelected, itemId }) {
    const allIds = Object.getOwnPropertyNames(itemIdToSelectedMap);
    let currentSelected = allIds;

    if (itemId !== 'all') {
      currentSelected = allIds.filter((id) =>
        itemIdToSelectedMap[id] === true && id !== itemId);

      if (isSelected === true) {
        currentSelected.push(itemId);
      }
    } else {
      if (isSelected === false) {
        currentSelected = [];
      } else {
        // grab all id's
        currentSelected = currentItems.map((item) => item.id);
      }
    }

    onTableChange(currentSelected);
  }

  function handlePageChange(pageIndex) {
    pager.goToPageIndex(pageIndex);
    setFirstAndLastIndex({
      ...firstAndLastIndex,
      firstItemIndex: pager.getFirstItemIndex(),
      lastItemIndex: pager.getLastItemIndex()
    });
  }

  function handleQueryChange({ query, err }) { // eslint-disable-line
    if (err) {
      setError(err);
    } else {
      setError(null);
      setCurrentItems(EuiSearchBar.Query.execute(query, items, { defaultFields: filterDefaultFields }));
      setQuery(query);
    }
  }

  function isItemSelected(itemId) {
    return itemIdToSelectedMap[itemId];
  }

  function areAllItemsSelected() {
    const indexOfUnselectedItem = currentItems.findIndex(item => !isItemSelected(item.id));
    return indexOfUnselectedItem === -1;
  }

  function renderSelectAll(mobile) {
    return (
      <EuiCheckbox
        id="selectAllCheckbox"
        label={mobile ? 'Select all' : null}
        checked={areAllItemsSelected()}
        onChange={toggleAll}
        type={mobile ? null : 'inList'}
      />
    );
  }

  function toggleItem(itemId) {
    const isSelected = !itemIdToSelectedMap[itemId];
    setItemIdToSelectedMap({ ...itemIdToSelectedMap, [itemId]: isSelected });
    handleTableChange({ isSelected, itemId });
  }

  function toggleAll() {
    const allSelected = areAllItemsSelected() || itemIdToSelectedMap.all === true;
    const newItemIdToSelectedMap = {};
    currentItems.forEach(item => newItemIdToSelectedMap[item.id] = !allSelected);
    setItemIdToSelectedMap(newItemIdToSelectedMap);
    handleTableChange({ isSelected: !allSelected, itemId: 'all' });
  }

  function onSort(prop) {
    sortableProperties.sortOn(prop);
    setSortedColumn(prop);
  }

  function renderHeaderCells() {
    const headers = [];

    columns.forEach((column, columnIndex) => {
      if (column.isCheckbox) {
        headers.push(
          <EuiTableHeaderCellCheckbox
            key={column.id}
            width={column.width}
          >
            {renderSelectAll()}
          </EuiTableHeaderCellCheckbox>
        );
      } else {
        headers.push(
          <EuiTableHeaderCell
            key={column.id}
            align={columns[columnIndex].alignment}
            width={column.width}
            onSort={column.isSortable ? () => onSort(column.id) : undefined}
            isSorted={sortedColumn === column.id}
            isSortAscending={true}//{sortableProperties.isAscendingByName(column.id)}
            mobileOptions={column.mobileOptions}
          >
            {column.label}
          </EuiTableHeaderCell>
        );
      }
    });

    return headers.length ? headers : null;
  }

  function renderRows() {
    const renderRow = item => {
      const cells = columns.map(column => {
        const cell = item[column.id];

        let child;

        if (column.isCheckbox) {
          return (
            <EuiTableRowCellCheckbox key={column.id}>
              <EuiCheckbox
                id={`${item.id}-checkbox`}
                checked={isItemSelected(item.id)}
                onChange={() => toggleItem(item.id)}
                type="inList"
              />
            </EuiTableRowCellCheckbox>
          );
        }

        if (column.render) {
          child = column.render(item);
          // } else if (cell.truncateText) {
          //   child = cell.value;
        } else {
          // child = cell;
          child = <p>{cell && cell.to ? cell.to : cell}</p>;
        }

        return (
          <EuiTableRowCell
            key={column.id}
            align={column.alignment}
            truncateText={cell && cell.truncateText}
            textOnly={cell ? cell.textOnly : true}
            mobileOptions={{
              header: column.label,
              ...column.mobileOptions
            }}
          >
            {child}
          </EuiTableRowCell>
        );
      });

      return (
        <EuiTableRow
          key={item.id}
          isSelected={isItemSelected(item.id)}
          isSelectable={true}
          hasActions={true}
        >
          {cells}
        </EuiTableRow>
      );
    };

    const rows = [];

    for (let itemIndex = firstAndLastIndex.firstItemIndex; itemIndex <= firstAndLastIndex.lastItemIndex; itemIndex++) {
      const item = currentItems[itemIndex];
      if (item === undefined) break;
      rows.push(renderRow(item));
    }

    return rows;
  }

  return (
    <Fragment>
      <EuiSpacer size="s"/>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          {filters !== undefined &&
          <EuiSearchBar
            defaultQuery={query}
            box={{
              placeholder: 'Search...'
            }}
            filters={filters}
            onChange={handleQueryChange}
          />}
        </EuiFlexItem>
        {/* <EuiFlexItem style={{ maxHeight: '0px' }}>
          <p>{getError(error)}</p>
        </EuiFlexItem>  */}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiTableHeaderMobile>
        <EuiFlexGroup
          responsive={false}
          justifyContent="spaceBetween"
          alignItems="baseline"
        >
          <EuiFlexItem grow={false}>
            {renderSelectAll(true)}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiTableHeaderMobile>
      <EuiTable>
        <EuiTableHeader>
          {renderHeaderCells()}
        </EuiTableHeader>
        <EuiTableBody>
          {renderRows()}
        </EuiTableBody>
      </EuiTable>
      <EuiSpacer size="m" />
      { pager !== undefined &&
        <EuiTablePagination
          activePage={pager.getCurrentPageIndex()}
          itemsPerPage={JOBS_PER_PAGE}
          itemsPerPageOptions={[JOBS_PER_PAGE]}
          pageCount={pager.getTotalPages()}
          onChangeItemsPerPage={() => {}}
          onChangePage={(pageIndex) => handlePageChange(pageIndex)}
        />}
    </Fragment>
  );
}
