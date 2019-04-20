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
import { ml } from '../../services/ml_api_service';

import {
  EuiLoadingSpinner,
  EuiTabbedContent,
} from '@elastic/eui';

import {
  LEFT_ALIGNMENT,
  CENTER_ALIGNMENT,
  SortableProperties,
} from '@elastic/eui/lib/services';
// import { i18n } from '@kbn/i18n';
// import { FormattedMessage } from '@kbn/i18n/react';


const JOB_FILTER_FIELDS = ['job_id', 'groups'];
const GROUP_FILTER_FIELDS = ['id'];

export function JobSelectorTable({
  jobs,
  onSelection,
  selectedIds,
  singleSelection
}) {
  const [sortableProperties, setSortableProperties] = useState();
  const [groupsList, setGroupsList] = useState([]);

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

  function handleSelection(selectionFromTable) {
    onSelection(selectionFromTable);
  }

  function handleTabSelection({ id }) {
    if (id === 'Groups') {
      ml.jobs.groups()
        .then((resp) => {// remove
          setGroupsList(resp);
        })
        .catch((err) => {
          console.log(err);
          return [];
        });
    }
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

    return (
      <CustomSelectionTable
        columns={columns}
        filterDefaultFields={!singleSelection ? JOB_FILTER_FIELDS : undefined}
        items={jobs}
        onTableChange={handleSelection}
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
          //<TimeRangeBar timerange={timeRange} />
          <span>{timeRange.to}</span>
        )
      }
    ];

    return (
      <CustomSelectionTable
        columns={groupColumns}
        filterDefaultFields={!singleSelection ? GROUP_FILTER_FIELDS : undefined}
        items={groupsList}
        onTableChange={(selection) => { console.log('THE SELECTION FROM GROUPS', selection); }}//{handleSelection}
        selectedIds={[]}//{selectedIds}
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
        onTabClick={(tab) => { handleTabSelection(tab); }}
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
