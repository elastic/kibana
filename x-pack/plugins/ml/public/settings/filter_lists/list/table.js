/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React table for displaying a table of filter lists.
 */

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import chrome from 'ui/chrome';
import { checkPermission } from '../../../privilege/check_privilege';
import { DeleteFilterListModal } from '../components/delete_filter_list_modal';



const UsedByIcon = injectI18n(function ({ usedBy, intl }) {
  // Renders a tick or cross in the 'usedBy' column to indicate whether
  // the filter list is in use in a detectors in any jobs.
  let icon;
  if (usedBy !== undefined && usedBy.jobs.length > 0) {
    icon = (
      <EuiIcon
        type="check"
        aria-label={intl.formatMessage({
          id: 'xpack.ml.settings.table.inUseAriaLabel',
          defaultMessage: 'In use',
        })}
      />
    );
  } else {
    icon = (
      <EuiIcon
        type="cross"
        aria-label={intl.formatMessage({
          id: 'xpack.ml.settings.table.notInUseAriaLabel',
          defaultMessage: 'Not in use',
        })}
      />
    );
  }

  return icon;
});

UsedByIcon.WrappedComponent.propTypes = {
  usedBy: PropTypes.object
};

function NewFilterButton() {
  const canCreateFilter = checkPermission('canCreateFilter');
  return (
    <EuiButton
      key="new_filter_list"
      href={`${chrome.getBasePath()}/app/ml#/settings/filter_lists/new_filter_list`}
      isDisabled={(canCreateFilter === false)}
    >
      <FormattedMessage
        id="xpack.ml.settings.table.newButtonLabel"
        defaultMessage="New"
      />
    </EuiButton>
  );
}

function getColumns() {

  const columns = [
    {
      field: 'filter_id',
      name: i18n.translate('xpack.ml.settings.table.idColumnName', {
        defaultMessage: 'ID',
      }),
      render: (id) => (
        <EuiLink href={`${chrome.getBasePath()}/app/ml#/settings/filter_lists/edit_filter_list/${id}`} >
          {id}
        </EuiLink>
      ),
      sortable: true
    },
    {
      field: 'description',
      name: i18n.translate('xpack.ml.settings.table.descriptionColumnName', {
        defaultMessage: 'Description',
      }),
      sortable: true
    },
    {
      field: 'item_count',
      name: i18n.translate('xpack.ml.settings.table.itemCountColumnName', {
        defaultMessage: 'Item count',
      }),
      sortable: true
    },
    {
      field: 'used_by',
      name: i18n.translate('xpack.ml.settings.table.inUseColumnName', {
        defaultMessage: 'In use',
      }),
      render: (usedBy) => (
        <UsedByIcon
          usedBy={usedBy}
        />
      ),
      sortable: true
    }
  ];

  return columns;
}

function renderToolsRight(selectedFilterLists, refreshFilterLists) {
  return [
    (
      <NewFilterButton
        key="new_filter_list"
      />
    ),
    (
      <DeleteFilterListModal
        selectedFilterLists={selectedFilterLists}
        refreshFilterLists={refreshFilterLists}
      />
    )];
}


export function FilterListsTable({
  filterLists,
  selectedFilterLists,
  setSelectedFilterLists,
  refreshFilterLists
}) {

  const sorting = {
    sort: {
      field: 'filter_id',
      direction: 'asc',
    }
  };

  const search = {
    toolsRight: renderToolsRight(selectedFilterLists, refreshFilterLists),
    box: {
      incremental: true,
    },
    filters: []
  };

  const tableSelection = {
    selectable: (filterList) => (filterList.used_by === undefined || filterList.used_by.jobs.length === 0),
    selectableMessage: () => undefined,
    onSelectionChange: (selection) => setSelectedFilterLists(selection)
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
                    id="xpack.ml.settings.table.noFiltersCreatedTitle"
                    defaultMessage="No filters have been created"
                  />
                </h4>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </React.Fragment>
      ) : (
        <React.Fragment>
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
          />
        </React.Fragment>
      )}
    </React.Fragment>
  );

}
FilterListsTable.propTypes = {
  filterLists: PropTypes.array,
  selectedFilterLists: PropTypes.array,
  setSelectedFilterLists: PropTypes.func.isRequired,
  refreshFilterLists: PropTypes.func.isRequired
};

UsedByIcon.displayName = 'UsedByIcon';
