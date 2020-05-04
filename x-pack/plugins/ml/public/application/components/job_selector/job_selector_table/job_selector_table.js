/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState, useEffect } from 'react';
import { PropTypes } from 'prop-types';
import { CustomSelectionTable } from '../custom_selection_table';
import { JobSelectorBadge } from '../job_selector_badge';
import { TimeRangeBar } from '../timerange_bar';

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiTabbedContent } from '@elastic/eui';

import { LEFT_ALIGNMENT, CENTER_ALIGNMENT, SortableProperties } from '@elastic/eui/lib/services';
import { i18n } from '@kbn/i18n';

const JOB_FILTER_FIELDS = ['job_id', 'groups'];
const GROUP_FILTER_FIELDS = ['id'];

export function JobSelectorTable({
  ganttBarWidth,
  groupsList,
  jobs,
  onSelection,
  selectedIds,
  singleSelection,
  timeseriesOnly,
}) {
  const [sortableProperties, setSortableProperties] = useState();
  const [currentTab, setCurrentTab] = useState('Jobs');

  useEffect(() => {
    let sortablePropertyItems = [];
    let defaultSortProperty = 'job_id';

    if (currentTab === 'Jobs' || singleSelection) {
      sortablePropertyItems = [
        {
          name: 'job_id',
          getValue: item => item.job_id.toLowerCase(),
          isAscending: true,
        },
        {
          name: 'groups',
          getValue: item => (item.groups && item.groups[0] ? item.groups[0].toLowerCase() : ''),
          isAscending: true,
        },
      ];
    } else if (currentTab === 'Groups') {
      defaultSortProperty = 'id';
      sortablePropertyItems = [
        {
          name: 'id',
          getValue: item => item.id.toLowerCase(),
          isAscending: true,
        },
      ];
    }
    const sortableProps = new SortableProperties(sortablePropertyItems, defaultSortProperty);

    setSortableProperties(sortableProps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, currentTab]);

  const tabs = [
    {
      id: 'Jobs',
      name: i18n.translate('xpack.ml.jobSelector.jobsTab', {
        defaultMessage: 'Jobs',
      }),
      content: renderJobsTable(),
    },
    {
      id: 'Groups',
      name: i18n.translate('xpack.ml.jobSelector.groupsTab', {
        defaultMessage: 'Groups',
      }),
      content: renderGroupsTable(),
    },
  ];

  function getGroupOptions() {
    return groupsList.map(g => ({
      value: g.id,
      view: (
        <Fragment>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem key={g.id} grow={false}>
              <JobSelectorBadge id={g.id} isGroup={true} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {i18n.translate('xpack.ml.jobSelector.filterBar.jobGroupTitle', {
                defaultMessage: `({jobsCount, plural, one {# job} other {# jobs}})`,
                values: { jobsCount: g.jobIds.length },
              })}
            </EuiFlexItem>
          </EuiFlexGroup>
        </Fragment>
      ),
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
        alignment: LEFT_ALIGNMENT,
      },
      {
        id: 'groups',
        label: 'groups',
        isSortable: true,
        alignment: LEFT_ALIGNMENT,
        render: ({ groups = [] }) =>
          groups.map(group => <JobSelectorBadge key={`${group}-key`} id={group} isGroup={true} />),
      },
      {
        label: 'time range',
        id: 'timerange',
        alignment: LEFT_ALIGNMENT,
        render: ({ timeRange = {}, isRunning }) => (
          <TimeRangeBar timerange={timeRange} isRunning={isRunning} ganttBarWidth={ganttBarWidth} />
        ),
      },
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
        options: getGroupOptions(),
      },
    ];

    return (
      <CustomSelectionTable
        columns={columns}
        filters={filters}
        filterDefaultFields={!singleSelection ? JOB_FILTER_FIELDS : undefined}
        items={jobs}
        onTableChange={selectionFromTable => onSelection({ selectionFromTable })}
        selectedIds={selectedIds}
        singleSelection={singleSelection}
        sortableProperties={sortableProperties}
        timeseriesOnly={timeseriesOnly}
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
        render: ({ id }) => <JobSelectorBadge id={id} isGroup={true} />,
      },
      {
        id: 'jobs in group',
        label: 'jobs in group',
        isSortable: false,
        alignment: CENTER_ALIGNMENT,
        render: ({ jobIds = [] }) => jobIds.length,
      },
      {
        label: 'time range',
        id: 'timerange',
        alignment: LEFT_ALIGNMENT,
        render: ({ timeRange = {} }) => (
          <TimeRangeBar timerange={timeRange} ganttBarWidth={ganttBarWidth} />
        ),
      },
    ];

    return (
      <CustomSelectionTable
        columns={groupColumns}
        filterDefaultFields={!singleSelection ? GROUP_FILTER_FIELDS : undefined}
        items={groupsList}
        onTableChange={selectionFromTable => onSelection({ selectionFromTable })}
        selectedIds={selectedIds}
        sortableProperties={sortableProperties}
      />
    );
  }

  function renderTabs() {
    return (
      <EuiTabbedContent
        size="s"
        tabs={tabs}
        initialSelectedTab={tabs[0]}
        onTabClick={tab => {
          setCurrentTab(tab.id);
        }}
      />
    );
  }

  return (
    <Fragment>
      {jobs.length === 0 && <EuiLoadingSpinner size="l" />}
      {jobs.length !== 0 && singleSelection === true && renderJobsTable()}
      {jobs.length !== 0 && singleSelection === undefined && renderTabs()}
    </Fragment>
  );
}

JobSelectorTable.propTypes = {
  ganttBarWidth: PropTypes.number.isRequired,
  groupsList: PropTypes.array,
  jobs: PropTypes.array,
  onSelection: PropTypes.func.isRequired,
  selectedIds: PropTypes.array.isRequired,
  singleSelection: PropTypes.bool,
  timeseriesOnly: PropTypes.bool,
};
