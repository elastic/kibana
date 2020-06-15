/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
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
  EuiText,
  EuiTitle,
  EuiSwitch,
} from '@elastic/eui';

import { EventsTable } from '../events_table';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

function EditHeader({ calendarId, description }) {
  return (
    <Fragment>
      <EuiTitle>
        <h1>
          <FormattedMessage
            id="xpack.ml.calendarsEdit.calendarForm.calendarTitle"
            defaultMessage="Calendar {calendarId}"
            values={{ calendarId }}
          />
        </h1>
      </EuiTitle>
      <EuiText>
        <p>{description}</p>
      </EuiText>
      <EuiSpacer size="l" />
    </Fragment>
  );
}

export const CalendarForm = ({
  calendarId,
  canCreateCalendar,
  canDeleteCalendar,
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
  showNewEventModal,
  isGlobalCalendar,
  onGlobalCalendarChange,
}) => {
  const msg = i18n.translate('xpack.ml.calendarsEdit.calendarForm.allowedCharactersDescription', {
    defaultMessage:
      'Use lowercase alphanumerics (a-z and 0-9), hyphens or underscores; ' +
      'must start and end with an alphanumeric character',
  });
  const helpText = isNewCalendarIdValid === true && !isEdit ? msg : undefined;
  const error = isNewCalendarIdValid === false && !isEdit ? [msg] : undefined;
  const saveButtonDisabled =
    canCreateCalendar === false || saving || !isNewCalendarIdValid || calendarId === '';

  return (
    <EuiForm>
      {isEdit === true ? (
        <EditHeader calendarId={calendarId} description={description} />
      ) : (
        <Fragment>
          <EuiTitle>
            <h1>
              <FormattedMessage
                id="xpack.ml.calendarsEdit.calendarForm.createCalendarTitle"
                defaultMessage="Create new calendar"
              />
            </h1>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.calendarsEdit.calendarForm.calendarIdLabel"
                defaultMessage="Calendar ID"
              />
            }
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
            label={
              <FormattedMessage
                id="xpack.ml.calendarsEdit.calendarForm.descriptionLabel"
                defaultMessage="Description"
              />
            }
          >
            <EuiFieldText
              name="description"
              value={description}
              onChange={onDescriptionChange}
              disabled={isEdit === true || saving === true}
            />
          </EuiFormRow>
        </Fragment>
      )}

      <EuiSpacer size="xl" />

      <EuiSwitch
        name="switch"
        label={
          <FormattedMessage
            id="xpack.ml.calendarsEdit.calendarForm.allJobsLabel"
            defaultMessage="Apply calendar to all jobs"
          />
        }
        checked={isGlobalCalendar}
        onChange={onGlobalCalendarChange}
        disabled={saving === true || canCreateCalendar === false}
      />

      {isGlobalCalendar === false && (
        <>
          <EuiSpacer size="m" />

          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.calendarsEdit.calendarForm.jobsLabel"
                defaultMessage="Jobs"
              />
            }
          >
            <EuiComboBox
              options={jobIds}
              selectedOptions={selectedJobOptions}
              onChange={onJobSelection}
              isDisabled={saving === true || canCreateCalendar === false}
            />
          </EuiFormRow>

          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.calendarsEdit.calendarForm.groupsLabel"
                defaultMessage="Groups"
              />
            }
          >
            <EuiComboBox
              onCreateOption={onCreateGroupOption}
              options={groupIds}
              selectedOptions={selectedGroupOptions}
              onChange={onGroupSelection}
              isDisabled={saving === true || canCreateCalendar === false}
            />
          </EuiFormRow>
        </>
      )}

      <EuiSpacer size="xl" />

      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.ml.calendarsEdit.calendarForm.eventsLabel"
            defaultMessage="Events"
          />
        }
        fullWidth
      >
        <EventsTable
          canCreateCalendar={canCreateCalendar}
          canDeleteCalendar={canDeleteCalendar}
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
          <EuiButton isDisabled={saving} href={'#/settings/calendars_list'}>
            <FormattedMessage
              id="xpack.ml.calendarsEdit.calendarForm.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="mlSaveCalendarButton"
            fill
            onClick={isEdit ? onEdit : onCreate}
            isDisabled={saveButtonDisabled}
          >
            {saving ? (
              <FormattedMessage
                id="xpack.ml.calendarsEdit.calendarForm.savingButtonLabel"
                defaultMessage="Saving…"
              />
            ) : (
              <FormattedMessage
                id="xpack.ml.calendarsEdit.calendarForm.saveButtonLabel"
                defaultMessage="Save"
              />
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};

CalendarForm.propTypes = {
  calendarId: PropTypes.string.isRequired,
  canCreateCalendar: PropTypes.bool.isRequired,
  canDeleteCalendar: PropTypes.bool.isRequired,
  description: PropTypes.string,
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
  isGlobalCalendar: PropTypes.bool.isRequired,
  onGlobalCalendarChange: PropTypes.func.isRequired,
};
