/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React, { Fragment, useState, useEffect } from 'react';
import { PropTypes } from 'prop-types';
// import { isTimeSeriesViewJob } from '../../../common/util/job_utils';
import { CustomSelectionTable } from './custom_selection_table';
import { tabColor } from './job_selector';

import {
  EuiBadge,
  EuiLoadingSpinner,
  EuiTabbedContent,
  EuiText,
} from '@elastic/eui';

import {
  LEFT_ALIGNMENT,
  SortableProperties,
} from '@elastic/eui/lib/services';
// import { i18n } from '@kbn/i18n';
// import { FormattedMessage } from '@kbn/i18n/react';


const DEFAULT_FILTER_FIELDS = ['job_id', 'groups'];

export function JobSelectorTable({
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
    content: (
      <Fragment>
        <EuiText>
          GROUPS STUFF.
        </EuiText>
      </Fragment>
    ),
  }];

  function handleSelection(selectionFromTable) {
    onSelection(selectionFromTable);
  }

  function getBadge(id) {
    return (
      <EuiBadge key={id} color={tabColor(id)}>
        {id}
      </EuiBadge>
    );
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
          groups.map((group) => getBadge(group))
        ),
      },
      {
        label: 'time range',
        id: 'timerange',
        alignment: LEFT_ALIGNMENT
      }
    ];

    return (
      <CustomSelectionTable
        columns={columns}
        filterDefaultFields={!singleSelection ? DEFAULT_FILTER_FIELDS : undefined}
        items={jobs}
        onTableChange={handleSelection}
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
        onTabClick={(tab) => { console.log('clicked tab', tab); }}
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
