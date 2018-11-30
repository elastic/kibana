/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import { PropTypes } from 'prop-types';

import {
  EuiButton,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';

import chrome from 'ui/chrome';
import { EventsTable } from './events_table';

export function CalendarForm({
  calendarId,
  description,
  eventsList,
  groupIds,
  isEdit,
  jobIds,
  onCalendarIdChange,
  onCreate,
  onCreateGroupOption,
  onDescriptionChange,
  onEdit,
  onEventDelete,
  onGroupSelection,
  onJobSelection,
  saving,
  selectedGroupOptions,
  selectedJobOptions,
  showNewEventModal
}) {
  return (
    <EuiForm>

      <EuiFormRow
        label="Calendar ID"
        fullWidth
      >
        <EuiFieldText
          name="calendarId"
          fullWidth
          value={calendarId}
          onChange={onCalendarIdChange}
          disabled={isEdit === true || saving === true}
        />
      </EuiFormRow>

      <EuiFormRow
        label="Description"
        fullWidth
      >
        <EuiFieldText
          name="description"
          fullWidth
          value={description}
          onChange={onDescriptionChange}
          disabled={isEdit === true || saving === true}
        />
      </EuiFormRow>

      <EuiFormRow
        label="Jobs"
        fullWidth
      >
        <EuiComboBox
          className="ml-calendar-combo-box"
          fullWidth
          options={jobIds}
          selectedOptions={selectedJobOptions}
          onChange={onJobSelection}
          disabled={saving === true}
        />
      </EuiFormRow>

      <EuiFormRow
        label="Groups"
        fullWidth
      >
        <EuiComboBox
          className="ml-calendar-combo-box"
          fullWidth
          onCreateOption={onCreateGroupOption}
          options={groupIds}
          selectedOptions={selectedGroupOptions}
          onChange={onGroupSelection}
          disabled={saving === true}
        />
      </EuiFormRow>

      <EuiSpacer size="xl" />

      <EuiFormRow
        label="Events"
        fullWidth
      >
        <EventsTable
          eventsList={eventsList}
          onDeleteClick={onEventDelete}
          showNewEventModal={showNewEventModal}
        />
      </EuiFormRow>
      <EuiSpacer size="l" />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            onClick={isEdit ? onEdit : onCreate}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            disabled={saving}
            href={`${chrome.getBasePath()}/app/ml#/settings/calendars_list`}
          >
            Cancel
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
}

CalendarForm.propTypes = {
  calendarId: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  groupIds: PropTypes.array.isRequired,
  isEdit: PropTypes.bool.isRequired,
  jobIds: PropTypes.array.isRequired,
  onCalendarIdChange: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  onCreateGroupOption: PropTypes.func.isRequired,
  onDescriptionChange: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onEventDelete: PropTypes.func.isRequired,
  onGroupSelection: PropTypes.func.isRequired,
  onJobSelection: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
  selectedGroupOptions: PropTypes.array.isRequired,
  selectedJobOptions: PropTypes.array.isRequired,
  showNewEventModal: PropTypes.func.isRequired,
};
