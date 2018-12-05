/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiLink,
  EuiInMemoryTable,
} from '@elastic/eui';

import chrome from 'ui/chrome';


export function CalendarsListTable({
  calendarsList,
  onDeleteClick,
  loading,
  canCreateCalendar,
  canDeleteCalendar,
  mlNodesAvailable,
}) {

  const sorting = {
    sort: {
      field: 'calendar_id',
      direction: 'asc',
    }
  };

  const pagination = {
    initialPageSize: 20,
    pageSizeOptions: [10, 20]
  };

  const columns = [
    {
      field: 'calendar_id',
      name: 'ID',
      sortable: true,
      truncateText: true,
      render: (id) => (
        <EuiLink
          href={`${chrome.getBasePath()}/app/ml#/settings/calendars_list/edit_calendar/${id}`}
        >
          {id}
        </EuiLink>
      )
    },
    {
      field: 'job_ids_string',
      name: 'Jobs',
      sortable: true,
      truncateText: true,
    },
    {
      field: 'events_length',
      name: 'Events',
      sortable: true
    },
    {
      field: '',
      name: '',
      render: (calendar) => (
        <EuiButtonEmpty
          size="xs"
          color="danger"
          onClick={() => { onDeleteClick(calendar.calendar_id); }}
          isDisabled={(canDeleteCalendar === false || mlNodesAvailable === false)}
        >
          Delete
        </EuiButtonEmpty>
      )
    },
  ];

  const search = {
    toolsRight: [
      (
        <EuiButton
          fill
          size="s"
          key="new_calendar_button"
          iconType="plusInCircle"
          href={`${chrome.getBasePath()}/app/ml#/settings/calendars_list/new_calendar`}
          isDisabled={(canCreateCalendar === false || mlNodesAvailable === false)}
        >
          New calendar
        </EuiButton>
      ),
    ],
    box: {
      incremental: true,
    },
    filters: []
  };

  return (
    <React.Fragment>
      <EuiInMemoryTable
        items={calendarsList}
        itemId="calendar_id"
        columns={columns}
        search={search}
        pagination={pagination}
        sorting={sorting}
        loading={loading}
      />
    </React.Fragment>
  );
}

CalendarsListTable.propTypes = {
  calendarsList: PropTypes.array.isRequired,
  onDeleteClick: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  canCreateCalendar: PropTypes.bool.isRequired,
  canDeleteCalendar: PropTypes.bool.isRequired,
  mlNodesAvailable: PropTypes.bool.isRequired
};
