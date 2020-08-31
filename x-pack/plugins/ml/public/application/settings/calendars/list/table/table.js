/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';

import { EuiButton, EuiLink, EuiInMemoryTable } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { GLOBAL_CALENDAR } from '../../../../../../common/constants/calendars';

export const CalendarsListTable = ({
  calendarsList,
  onDeleteClick,
  setSelectedCalendarList,
  loading,
  canCreateCalendar,
  canDeleteCalendar,
  mlNodesAvailable,
  itemsSelected,
}) => {
  const sorting = {
    sort: {
      field: 'calendar_id',
      direction: 'asc',
    },
  };

  const pagination = {
    initialPageSize: 20,
    pageSizeOptions: [10, 20],
  };

  const columns = [
    {
      field: 'calendar_id',
      name: i18n.translate('xpack.ml.calendarsList.table.idColumnName', {
        defaultMessage: 'ID',
      }),
      sortable: true,
      truncateText: true,
      scope: 'row',
      render: (id) => (
        <EuiLink href={`#/settings/calendars_list/edit_calendar/${id}`}>{id}</EuiLink>
      ),
    },
    {
      field: 'job_ids_string',
      name: i18n.translate('xpack.ml.calendarsList.table.jobsColumnName', {
        defaultMessage: 'Jobs',
      }),
      sortable: true,
      truncateText: true,
      render: (jobList) => {
        return jobList === GLOBAL_CALENDAR ? (
          <span style={{ fontStyle: 'italic' }}>
            <FormattedMessage
              id="xpack.ml.calendarsList.table.allJobsLabel"
              defaultMessage="Applies to all jobs"
            />
          </span>
        ) : (
          jobList
        );
      },
    },
    {
      field: 'events_length',
      name: i18n.translate('xpack.ml.calendarsList.table.eventsColumnName', {
        defaultMessage: 'Events',
      }),
      sortable: true,
      render: (eventsLength) =>
        i18n.translate('xpack.ml.calendarsList.table.eventsCountLabel', {
          defaultMessage: '{eventsLength, plural, one {# event} other {# events}}',
          values: { eventsLength },
        }),
    },
  ];

  const tableSelection = {
    onSelectionChange: (selection) => setSelectedCalendarList(selection),
  };

  const search = {
    toolsRight: [
      <EuiButton
        size="s"
        data-test-subj="mlCalendarButtonCreate"
        key="new_calendar_button"
        href="#/settings/calendars_list/new_calendar"
        isDisabled={canCreateCalendar === false || mlNodesAvailable === false}
      >
        <FormattedMessage id="xpack.ml.calendarsList.table.newButtonLabel" defaultMessage="New" />
      </EuiButton>,
      <EuiButton
        size="s"
        color="danger"
        iconType="trash"
        onClick={onDeleteClick}
        isDisabled={
          canDeleteCalendar === false || mlNodesAvailable === false || itemsSelected === false
        }
      >
        <FormattedMessage
          id="xpack.ml.calendarsList.table.deleteButtonLabel"
          defaultMessage="Delete"
        />
      </EuiButton>,
    ],
    box: {
      incremental: true,
    },
    filters: [],
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
        selection={tableSelection}
        isSelectable={true}
        data-test-subj="mlCalendarTable"
      />
    </React.Fragment>
  );
};

CalendarsListTable.propTypes = {
  calendarsList: PropTypes.array.isRequired,
  onDeleteClick: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  canCreateCalendar: PropTypes.bool.isRequired,
  canDeleteCalendar: PropTypes.bool.isRequired,
  mlNodesAvailable: PropTypes.bool.isRequired,
  setSelectedCalendarList: PropTypes.func.isRequired,
  itemsSelected: PropTypes.bool.isRequired,
};
