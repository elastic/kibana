/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React, { Fragment, useState } from 'react';
import { PropTypes } from 'prop-types';
// import { isTimeSeriesViewJob } from '../../../common/util/job_utils';

import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiTabbedContent,
  EuiText,
} from '@elastic/eui';


export function JobSelectorContent({
  jobs,
  onSelection,
  selectedIds,
  singleSelection,
  timeseriesOnly // eslint-disable-line
}) {
  const [currentSelection, setCurrentSelection] = useState(selectedIds);

  const tabs = [{
    id: 'Jobs',
    name: 'Jobs',
    content: renderJobsTable(),
  },
  {
    id: 'Groups',
    name: 'Groups',
    content: (
      <Fragment>
        <EuiText>
          GROUPS STUFF.
        </EuiText>
      </Fragment>
    ),
  }];

  function handleSelection(selectionFromTable) {
    const ids = selectionFromTable.map(job => job.job_id);
    setCurrentSelection(ids);
    onSelection(ids);
  }

  function renderJobsTable() {
    const columns = [
      {
        name: 'job ID',
        field: 'job_id',
        sortable: true
      },
      {
        name: 'groups',
        field: 'groups',
        sortable: true
        // render: TODO: render group badges
      },
      {
        name: 'time range',
        field: 'timerange',
      }
    ];
    // TODO: implement pagination
    // const pagination = {
    //   initialPageSize: 25,
    //   pageSizeOptions: [25]
    // };

    const selection = {
      selectable: () => true, // timeseriesOnly === undefined ||
      // selectableMessage: (selectable) => !selectable ? 'User is currently offline' : undefined,
      onSelectionChange: (selected) => { handleSelection(selected); }
    };

    return (
      <EuiBasicTable
        itemId="job_id"
        items={jobs}
        columns={columns}
        isSelectable={true}
        selection={selection}
      />
    );
  }

  function renderTabs() {
    return (
      <EuiTabbedContent
        size="s"
        tabs={tabs}
        initialSelectedTab={tabs[0]}
        onTabClick={(tab) => { console.log('clicked tab', tab); }}
      />
    );
  }

  return (
    <Fragment>
      <EuiFlexGroup wrap responsive={false} gutterSize="xs" alignItems="center">
        {currentSelection.map(id => (
          <EuiFlexItem grow={false} key={id}>
            <EuiBadge color={'hollow'}>
              {id}
            </EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      {jobs.length === 0 && <EuiLoadingSpinner size="l" />}
      {jobs.length !== 0 && singleSelection === 'true' && renderJobsTable()}
      {jobs.length !== 0 && singleSelection === undefined && renderTabs()}
    </Fragment>
  );
}

JobSelectorContent.propTypes = {
  jobs: PropTypes.array,
  onSelection: PropTypes.func,
  singleSelection: PropTypes.string,
  timeseriesOnly: PropTypes.string
};
