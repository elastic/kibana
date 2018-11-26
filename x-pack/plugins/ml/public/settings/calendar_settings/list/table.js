/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import PropTypes from 'prop-types';
import React, { Fragment } from 'react';

import {
  EuiButton,
  EuiInMemoryTable,
} from '@elastic/eui';

import { checkPermission } from '../../../privilege/check_privilege';
import { RowButtons } from './row_buttons';
import chrome from 'ui/chrome';


function NewCalendarButton() {
  const canCreateCalendar = checkPermission('canCreateCalendar');

  return (
    <Fragment>
      <EuiButton
        fill
        size="s"
        key="new_calendar_button"
        iconType="plusInCircle"
        href={`${chrome.getBasePath()}/app/ml#/settings/calendars_list/new_calendar`}
        isDisabled={canCreateCalendar === false}
      >
        New calendar
      </EuiButton>
    </Fragment>
  );
}

function renderToolsRight() {
  return [
    (
      <NewCalendarButton
        key="new_calendar_button"
      />
    ),
  ];
}

export function CalendarsListTable({
  calendarsList,
  onDeleteClick,
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
        <RowButtons
          onDeleteClick={() => { onDeleteClick(calendar.calendar_id); }}
          editUrl={`${chrome.getBasePath()}/app/ml#/settings/calendars_list/edit_calendar/${calendar.calendar_id}`}
        />
      )
    },
  ];

  const search = {
    toolsRight: renderToolsRight(),
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
      />
    </React.Fragment>
  );
}

CalendarsListTable.propTypes = {
  calendarsList: PropTypes.array.isRequired,
  onDeleteClick: PropTypes.func.isRequired,
};
