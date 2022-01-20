/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import PropTypes from 'prop-types';
import React from 'react';

import { EuiButton, EuiInMemoryTable } from '@elastic/eui';
import { Link } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { GLOBAL_CALENDAR } from '../../../../../../common/constants/calendars';
import { useCreateAndNavigateToMlLink } from '../../../../contexts/kibana/use_create_url';
import { ML_PAGES } from '../../../../../../common/constants/locator';

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
  const redirectToNewCalendarPage = useCreateAndNavigateToMlLink(ML_PAGES.CALENDARS_NEW);

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
        <Link to={`/${ML_PAGES.CALENDARS_EDIT}/${id}`} data-test-subj="mlEditCalendarLink">
          {id}
        </Link>
      ),
      'data-test-subj': 'mlCalendarListColumnId',
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
      'data-test-subj': 'mlCalendarListColumnJobs',
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
      'data-test-subj': 'mlCalendarListColumnEvents',
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
        onClick={redirectToNewCalendarPage}
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
        data-test-subj="mlCalendarButtonDelete"
        key="delete_calendar_button"
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
    <div data-test-subj="mlCalendarTableContainer">
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
        data-test-subj={loading ? 'mlCalendarTable loading' : 'mlCalendarTable loaded'}
        rowProps={(item) => ({
          'data-test-subj': `mlCalendarListRow row-${item.calendar_id}`,
        })}
      />
    </div>
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
