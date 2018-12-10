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
import { EventsTable } from '../events_table/';

export function CalendarForm({
  calendarId,
  description,
  eventsList,
  groupIds,
  isEdit,
  isNewCalendarIdValid,
  jobIds,
  onCalendarIdChange,
  onCreate,
  onCreateGroupOption,
  onDescriptionChange,
  onEdit,
  onEventDelete,
  onGroupSelection,
  showImportModal,
  onJobSelection,
  saving,
  selectedGroupOptions,
  selectedJobOptions,
  showNewEventModal
}) {
  const msg = `Use lowercase alphanumerics (a-z and 0-9), hyphens or underscores;
    must start and end with an alphanumeric character`;
  const helpText = (isNewCalendarIdValid === true && !isEdit) ? msg : undefined;
  const error = (isNewCalendarIdValid === false && !isEdit) ? [msg] : undefined;

  return (
    <EuiForm>

      <EuiFormRow
        label="Calendar ID"
        helpText={helpText}
        error={error}
        isInvalid={!isNewCalendarIdValid}
      >
        <EuiFieldText
          name="calendarId"
          value={calendarId}
          onChange={onCalendarIdChange}
          disabled={isEdit === true || saving === true}
        />
      </EuiFormRow>

      <EuiFormRow
        label="Description"
      >
        <EuiFieldText
          name="description"
          value={description}
          onChange={onDescriptionChange}
          disabled={isEdit === true || saving === true}
        />
      </EuiFormRow>

      <EuiFormRow
        label="Jobs"
      >
        <EuiComboBox
          options={jobIds}
          selectedOptions={selectedJobOptions}
          onChange={onJobSelection}
          disabled={saving === true}
        />
      </EuiFormRow>

      <EuiFormRow
        label="Groups"
      >
        <EuiComboBox
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
          showImportModal={showImportModal}
          showNewEventModal={showNewEventModal}
          showSearchBar
        />
      </EuiFormRow>
      <EuiSpacer size="l" />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            onClick={isEdit ? onEdit : onCreate}
            disabled={saving || !isNewCalendarIdValid || calendarId === ''}
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
  isNewCalendarIdValid: PropTypes.bool.isRequired,
  jobIds: PropTypes.array.isRequired,
  onCalendarIdChange: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  onCreateGroupOption: PropTypes.func.isRequired,
  onDescriptionChange: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onEventDelete: PropTypes.func.isRequired,
  onGroupSelection: PropTypes.func.isRequired,
  showImportModal: PropTypes.func.isRequired,
  onJobSelection: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
  selectedGroupOptions: PropTypes.array.isRequired,
  selectedJobOptions: PropTypes.array.isRequired,
  showNewEventModal: PropTypes.func.isRequired,
};
