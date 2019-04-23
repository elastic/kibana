/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React, { Fragment, useState, useEffect } from 'react';
import { PropTypes } from 'prop-types';
// import { isTimeSeriesViewJob } from '../../../common/util/job_utils';
import { CustomSelectionTable } from './custom_selection_table';
import { getBadge } from './job_selector';
import { TimeRangeBar } from './timerange_bar';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiTabbedContent,
} from '@elastic/eui';

import {
  LEFT_ALIGNMENT,
  CENTER_ALIGNMENT,
  SortableProperties,
} from '@elastic/eui/lib/services';
import { i18n } from '@kbn/i18n';


const JOB_FILTER_FIELDS = ['job_id', 'groups'];
const GROUP_FILTER_FIELDS = ['id'];

export function JobSelectorTable({
  groupsList,
  jobs,
  onSelection,
  selectedIds,
  singleSelection
}) {
  const [sortableProperties, setSortableProperties] = useState();

  useEffect(() => {
    const sortableProps = new SortableProperties([{
      name: 'job_id',
      getValue: item => item.job_id.toLowerCase(),
      isAscending: true,
    }], 'job_id');

    setSortableProperties(sortableProps);
  }, [jobs]); // eslint-disable-line

  const tabs = [{
    id: 'Jobs',
    name: 'Jobs',
    content: renderJobsTable(),
  },
  {
    id: 'Groups',
    name: 'Groups',
    content: renderGroupsTable()
  }];

  function getGroupOptions() {
    return groupsList.map(g => ({
      value: g.id,
      view: (
        <Fragment>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem key={g.id} grow={false}>
              {getBadge({ id: g.id, isGroup: true })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {i18n.translate('xpack.ml.jobSelector.filterBar.jobGroupTitle', {
                defaultMessage: `({jobsCount, plural, one {# job} other {# jobs}})`,
                values: { jobsCount: g.jobIds.length },
              })}
            </EuiFlexItem>
          </EuiFlexGroup>
        </Fragment>
      )
    }));
  }

  function renderJobsTable() {
    const columns = [
      {
        id: 'checkbox',
        isCheckbox: true,
        textOnly: false,
        width: '24px',
      },
      {
        label: 'job ID',
        id: 'job_id',
        isSortable: true,
        alignment: LEFT_ALIGNMENT
      },
      {
        id: 'groups',
        label: 'groups',
        isSortable: true,
        alignment: LEFT_ALIGNMENT,
        render: ({ groups = [] }) => (
          groups.map((group) => getBadge({ id: group, isGroup: true }))
        ),
      },
      {
        label: 'time range',
        id: 'timerange',
        alignment: LEFT_ALIGNMENT,
        render: ({ timeRange = {} }) => (
          <TimeRangeBar timerange={timeRange} />
        )
      }
    ];

    const filters = [
      {
        type: 'field_value_selection',
        field: 'groups',
        name: i18n.translate('xpack.ml.jobSelector.filterBar.groupLabel', {
          defaultMessage: 'Group',
        }),
        loadingMessage: 'Loading...',
        noOptionsMessage: 'No groups found.',
        multiSelect: 'or',
        cache: 10000,
        options: getGroupOptions()
      }
    ];

    return (
      <CustomSelectionTable
        columns={columns}
        filters={filters}
        filterDefaultFields={!singleSelection ? JOB_FILTER_FIELDS : undefined}
        items={jobs}
        onTableChange={(selectionFromTable) => onSelection({ selectionFromTable })}
        selectedIds={selectedIds}
        sortableProperties={sortableProperties}
      />
    );
  }

  function renderGroupsTable() {
    const groupColumns = [
      {
        id: 'checkbox',
        isCheckbox: true,
        textOnly: false,
        width: '24px',
      },
      {
        label: 'group ID',
        id: 'id',
        isSortable: true,
        alignment: LEFT_ALIGNMENT,
        render: ({ id }) => getBadge({ id, isGroup: true })
      },
      {
        id: 'jobs in group',
        label: 'jobs in group',
        isSortable: false,
        alignment: CENTER_ALIGNMENT,
        render: ({ jobIds = [] }) => jobIds.length
      },
      {
        label: 'time range',
        id: 'timerange',
        alignment: LEFT_ALIGNMENT,
        render: ({ timeRange = {} }) => (
          <TimeRangeBar timerange={timeRange} />
        )
      }
    ];

    return (
      <CustomSelectionTable
        columns={groupColumns}
        filterDefaultFields={!singleSelection ? GROUP_FILTER_FIELDS : undefined}
        items={groupsList}
        onTableChange={(selectionFromTable) => onSelection({ selectionFromTable, isGroup: true })}
        selectedIds={selectedIds}
        // sortableProperties={sortableProperties}
      />
    );
  }

  function renderTabs() {
    return (
      <EuiTabbedContent
        size="s"
        tabs={tabs}
        initialSelectedTab={tabs[0]}
        onTabClick={(tab) => { console.log('Tab -', tab); }} // handleTabSelection(tab);
      />
    );
  }

  return (
    <Fragment>
      {jobs.length === 0 && <EuiLoadingSpinner size="l" />}
      {jobs.length !== 0 && singleSelection === 'true' && renderJobsTable()}
      {jobs.length !== 0 && singleSelection === undefined && renderTabs()}
    </Fragment>
  );
}

JobSelectorTable.propTypes = {
  jobs: PropTypes.array,
  onSelection: PropTypes.func,
  singleSelection: PropTypes.string,
  timeseriesOnly: PropTypes.string
};
