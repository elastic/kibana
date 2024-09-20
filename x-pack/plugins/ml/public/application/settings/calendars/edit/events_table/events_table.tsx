/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import moment from 'moment';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { EuiButton, EuiButtonEmpty, EuiInMemoryTable, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { TIME_FORMAT } from '@kbn/ml-date-utils';
import { usePermissionCheck } from '../../../../capabilities/check_capabilities';

const DeleteButton: FC<{
  onClick: () => void;
  testSubj: string;
  disabled: boolean;
}> = ({ onClick, testSubj, disabled }) => {
  return (
    <>
      <EuiButtonEmpty
        size="xs"
        color="danger"
        onClick={onClick}
        isDisabled={disabled}
        data-test-subj={testSubj}
      >
        <FormattedMessage
          id="xpack.ml.calendarsEdit.eventsTable.deleteButtonLabel"
          defaultMessage="Delete"
        />
      </EuiButtonEmpty>
    </>
  );
};

interface Props {
  eventsList: estypes.MlCalendarEvent[];
  onDeleteClick: (eventId: string) => void;
  showImportModal: () => void;
  showNewEventModal: () => void;
  showSearchBar?: boolean;
  loading?: boolean;
  saving?: boolean;
}

export const EventsTable: FC<Props> = ({
  eventsList,
  onDeleteClick,
  showSearchBar,
  showImportModal,
  showNewEventModal,
  loading,
  saving,
}) => {
  const [canCreateCalendar, canDeleteCalendar] = usePermissionCheck([
    'canCreateCalendar',
    'canDeleteCalendar',
  ]);

  const pagination = {
    initialPageSize: 5,
    pageSizeOptions: [5, 10],
  };

  const columns = [
    {
      field: 'description',
      name: i18n.translate('xpack.ml.calendarsEdit.eventsTable.descriptionColumnName', {
        defaultMessage: 'Description',
      }),
      sortable: true,
      truncateText: true,
      scope: 'row',
    },
    {
      field: 'start_time',
      name: i18n.translate('xpack.ml.calendarsEdit.eventsTable.startColumnName', {
        defaultMessage: 'Start',
      }),
      sortable: true,
      render: (timeMs: number) => {
        const time = moment(timeMs);
        return time.format(TIME_FORMAT);
      },
    },
    {
      field: 'end_time',
      name: i18n.translate('xpack.ml.calendarsEdit.eventsTable.endColumnName', {
        defaultMessage: 'End',
      }),
      sortable: true,
      render: (timeMs: number) => {
        const time = moment(timeMs);
        return time.format(TIME_FORMAT);
      },
    },
    {
      field: '',
      name: '',
      render: (event: estypes.MlCalendarEvent) => (
        <DeleteButton
          testSubj="mlCalendarEventDeleteButton"
          disabled={canDeleteCalendar === false || saving === true || loading === true}
          onClick={() => {
            onDeleteClick(event.event_id!);
          }}
        />
      ),
    },
  ];

  const search = {
    toolsRight: [
      <EuiButton
        isDisabled={canCreateCalendar === false || saving === true || loading === true}
        key="ml_new_event"
        data-test-subj="mlCalendarNewEventButton"
        size="s"
        iconType="plusInCircle"
        onClick={showNewEventModal}
      >
        <FormattedMessage
          id="xpack.ml.calendarsEdit.eventsTable.newEventButtonLabel"
          defaultMessage="New event"
        />
      </EuiButton>,
      <EuiButton
        isDisabled={canCreateCalendar === false || saving === true || loading === true}
        key="ml_import_event"
        data-test-subj="mlCalendarImportEventsButton"
        size="s"
        iconType="importAction"
        onClick={showImportModal}
      >
        <FormattedMessage
          id="xpack.ml.calendarsEdit.eventsTable.importEventsButtonLabel"
          defaultMessage="Import events"
        />
      </EuiButton>,
    ],
    box: {
      incremental: true,
    },
    filters: [],
  };

  return (
    <>
      <EuiSpacer size="m" />
      <EuiInMemoryTable<estypes.MlCalendarEvent>
        items={eventsList}
        itemId="event_id"
        columns={columns}
        pagination={pagination}
        sorting={{
          sort: {
            field: 'start_time',
            direction: 'asc',
          },
        }}
        search={showSearchBar ? search : undefined}
        data-test-subj="mlCalendarEventsTable"
        rowProps={(item) => ({
          'data-test-subj': `mlCalendarEventListRow row-${item.description}`,
        })}
      />
    </>
  );
};
