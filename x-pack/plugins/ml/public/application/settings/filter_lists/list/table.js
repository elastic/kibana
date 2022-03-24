/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React table for displaying a table of filter lists.
 */

import PropTypes from 'prop-types';
import React from 'react';
import { Link } from 'react-router-dom';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { DeleteFilterListModal } from '../components/delete_filter_list_modal';
import { useCreateAndNavigateToMlLink } from '../../../contexts/kibana/use_create_url';
import { ML_PAGES } from '../../../../../common/constants/locator';

function UsedByIcon({ usedBy }) {
  // Renders a tick or cross in the 'usedBy' column to indicate whether
  // the filter list is in use in a detectors in any jobs.
  let icon;
  if (usedBy !== undefined && usedBy.jobs.length > 0) {
    icon = (
      <EuiIcon
        type="check"
        aria-label={i18n.translate('xpack.ml.settings.filterLists.table.inUseAriaLabel', {
          defaultMessage: 'In use',
        })}
        data-test-subj="mlFilterListUsedByIcon inUse"
      />
    );
  } else {
    icon = (
      <EuiIcon
        type="cross"
        aria-label={i18n.translate('xpack.ml.settings.filterLists.table.notInUseAriaLabel', {
          defaultMessage: 'Not in use',
        })}
        data-test-subj="mlFilterListUsedByIcon notInUse"
      />
    );
  }

  return icon;
}

UsedByIcon.propTypes = {
  usedBy: PropTypes.object,
};

function NewFilterButton({ canCreateFilter }) {
  const redirectToNewFilterListPage = useCreateAndNavigateToMlLink(ML_PAGES.FILTER_LISTS_NEW);

  return (
    <EuiButton
      key="new_filter_list"
      onClick={redirectToNewFilterListPage}
      isDisabled={canCreateFilter === false}
      data-test-subj="mlFilterListsButtonCreate"
    >
      <FormattedMessage
        id="xpack.ml.settings.filterLists.table.newButtonLabel"
        defaultMessage="New"
      />
    </EuiButton>
  );
}

function getColumns() {
  const columns = [
    {
      field: 'filter_id',
      name: i18n.translate('xpack.ml.settings.filterLists.table.idColumnName', {
        defaultMessage: 'ID',
      }),
      render: (id) => (
        <Link to={`/${ML_PAGES.FILTER_LISTS_EDIT}/${id}`} data-test-subj="mlEditFilterListLink">
          {id}
        </Link>
      ),
      sortable: true,
      scope: 'row',
      'data-test-subj': 'mlFilterListColumnId',
    },
    {
      field: 'description',
      name: i18n.translate('xpack.ml.settings.filterLists.table.descriptionColumnName', {
        defaultMessage: 'Description',
      }),
      sortable: true,
      'data-test-subj': 'mlFilterListColumnDescription',
    },
    {
      field: 'item_count',
      name: i18n.translate('xpack.ml.settings.filterLists.table.itemCountColumnName', {
        defaultMessage: 'Item count',
      }),
      sortable: true,
      'data-test-subj': 'mlFilterListColumnItemCount',
    },
    {
      field: 'used_by',
      name: i18n.translate('xpack.ml.settings.filterLists.table.inUseColumnName', {
        defaultMessage: 'In use',
      }),
      render: (usedBy) => <UsedByIcon usedBy={usedBy} />,
      sortable: true,
      'data-test-subj': 'mlFilterListColumnInUse',
    },
  ];

  return columns;
}

function renderToolsRight(
  canCreateFilter,
  canDeleteFilter,
  selectedFilterLists,
  refreshFilterLists
) {
  return [
    <NewFilterButton key="new_filter_list" canCreateFilter={canCreateFilter} />,
    <DeleteFilterListModal
      canDeleteFilter={canDeleteFilter}
      selectedFilterLists={selectedFilterLists}
      refreshFilterLists={refreshFilterLists}
    />,
  ];
}

export function FilterListsTable({
  canCreateFilter,
  canDeleteFilter,
  filterLists,
  selectedFilterLists,
  setSelectedFilterLists,
  refreshFilterLists,
}) {
  const sorting = {
    sort: {
      field: 'filter_id',
      direction: 'asc',
    },
  };

  const search = {
    toolsRight: renderToolsRight(
      canCreateFilter,
      canDeleteFilter,
      selectedFilterLists,
      refreshFilterLists
    ),
    box: {
      incremental: true,
    },
    filters: [],
  };

  const tableSelection = {
    selectable: (filterList) =>
      filterList.used_by === undefined || filterList.used_by.jobs.length === 0,
    selectableMessage: () => undefined,
    onSelectionChange: (selection) => setSelectedFilterLists(selection),
  };

  return (
    <React.Fragment>
      {filterLists === undefined || filterLists.length === 0 ? (
        <React.Fragment>
          <EuiFlexGroup alignItems="flexEnd" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <NewFilterButton />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <EuiFlexGroup justifyContent="spaceAround">
            <EuiFlexItem grow={false}>
              <EuiText>
                <h4>
                  <FormattedMessage
                    id="xpack.ml.settings.filterLists.table.noFiltersCreatedTitle"
                    defaultMessage="No filters have been created"
                  />
                </h4>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </React.Fragment>
      ) : (
        <div data-test-subj="mlFilterListTableContainer">
          <EuiInMemoryTable
            className="ml-filter-lists-table"
            items={filterLists}
            itemId="filter_id"
            columns={getColumns()}
            search={search}
            pagination={true}
            sorting={sorting}
            selection={tableSelection}
            isSelectable={true}
            data-test-subj="mlFilterListsTable"
            rowProps={(item) => ({
              'data-test-subj': `mlFilterListRow row-${item.filter_id}`,
            })}
          />
        </div>
      )}
    </React.Fragment>
  );
}
FilterListsTable.propTypes = {
  canCreateFilter: PropTypes.bool.isRequired,
  canDeleteFilter: PropTypes.bool.isRequired,
  filterLists: PropTypes.array,
  selectedFilterLists: PropTypes.array,
  setSelectedFilterLists: PropTypes.func.isRequired,
  refreshFilterLists: PropTypes.func.isRequired,
};

UsedByIcon.displayName = 'UsedByIcon';
