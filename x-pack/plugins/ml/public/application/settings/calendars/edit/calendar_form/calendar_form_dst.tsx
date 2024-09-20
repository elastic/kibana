/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { EuiSwitchEvent, EuiComboBoxOptionOption } from '@elastic/eui';
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
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { usePermissionCheck } from '../../../../capabilities/check_capabilities';
import { ML_PAGES } from '../../../../../../common/constants/locator';
import { useCreateAndNavigateToMlLink } from '../../../../contexts/kibana/use_create_url';
import { MlPageHeader } from '../../../../components/page_header';
import { DstEventGenerator } from './dst_event_generator';
import { EventsTable } from '../events_table';

const EditHeader: FC<{ calendarId: string; description: string }> = ({
  calendarId,
  description,
}) => {
  return (
    <>
      <MlPageHeader>
        <span data-test-subj={'mlCalendarTitle'}>
          <FormattedMessage
            id="xpack.ml.calendarsEdit.calendarForm.calendarTitle"
            defaultMessage="Calendar {calendarId}"
            values={{ calendarId }}
          />
        </span>
      </MlPageHeader>
      {description ? (
        <>
          <EuiText data-test-subj={'mlCalendarDescriptionText'}>
            <p>{description}</p>
          </EuiText>
          <EuiSpacer size="l" />
        </>
      ) : null}
    </>
  );
};

interface Props {
  calendarId: string;
  description: string;
  eventsList: estypes.MlCalendarEvent[];
  groupIdOptions: EuiComboBoxOptionOption[];
  isEdit: boolean;
  isNewCalendarIdValid: boolean;
  jobIdOptions: EuiComboBoxOptionOption[];
  onCalendarIdChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCreate: () => void;
  onCreateGroupOption: (searchValue: string, flattenedOptions: EuiComboBoxOptionOption[]) => void;
  onDescriptionChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEdit: () => void;
  onEventDelete: (eventId: string) => void;
  onGroupSelection: (selectedOptions: any) => void;
  showImportModal: () => void;
  onJobSelection: (selectedOptions: any) => void;
  saving: boolean;
  loading: boolean;
  selectedGroupOptions: EuiComboBoxOptionOption[];
  selectedJobOptions: EuiComboBoxOptionOption[];
  showNewEventModal: () => void;
  isGlobalCalendar: boolean;
  onGlobalCalendarChange: (e: EuiSwitchEvent) => void;
  addEvents: (events: estypes.MlCalendarEvent[]) => void;
}

export const CalendarFormDst: FC<Props> = ({
  calendarId,
  description,
  eventsList,
  groupIdOptions,
  isEdit,
  isNewCalendarIdValid,
  jobIdOptions,
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
  loading,
  selectedGroupOptions,
  selectedJobOptions,
  showNewEventModal,
  isGlobalCalendar,
  onGlobalCalendarChange,
  addEvents,
}) => {
  const [canCreateCalendar] = usePermissionCheck(['canCreateCalendar']);
  const msg = i18n.translate('xpack.ml.calendarsEdit.calendarForm.allowedCharactersDescription', {
    defaultMessage:
      'Use lowercase alphanumerics (a-z and 0-9), hyphens or underscores; ' +
      'must start and end with an alphanumeric character',
  });
  const helpText = isNewCalendarIdValid === true && !isEdit ? msg : undefined;
  const error = isNewCalendarIdValid === false && !isEdit ? [msg] : undefined;
  const saveButtonDisabled =
    canCreateCalendar === false ||
    saving ||
    !isNewCalendarIdValid ||
    calendarId === '' ||
    loading === true;
  const redirectToCalendarsManagementPage = useCreateAndNavigateToMlLink(ML_PAGES.CALENDARS_MANAGE);

  return (
    <EuiForm data-test-subj={`mlCalendarForm${isEdit === true ? 'Edit' : 'New'}`}>
      {isEdit === true ? (
        <EditHeader calendarId={calendarId} description={description} />
      ) : (
        <>
          <MlPageHeader>
            <FormattedMessage
              id="xpack.ml.calendarsEdit.calendarForm.createCalendarTitle"
              defaultMessage="Create new DST calendar"
            />
          </MlPageHeader>
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
              disabled={saving === true || loading === true}
              data-test-subj="mlCalendarIdInput"
            />
          </EuiFormRow>

          <EuiSpacer size="m" />
        </>
      )}

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
            options={jobIdOptions}
            selectedOptions={selectedJobOptions}
            onChange={onJobSelection}
            isDisabled={saving === true || canCreateCalendar === false || loading === true}
            data-test-subj="mlCalendarJobSelection"
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
            options={groupIdOptions}
            selectedOptions={selectedGroupOptions}
            onChange={onGroupSelection}
            isDisabled={saving === true || canCreateCalendar === false || loading === true}
            data-test-subj="mlCalendarJobGroupSelection"
          />
        </EuiFormRow>
      </>

      <EuiSpacer size="xl" />

      <EuiFormRow
        // label={
        //   <FormattedMessage
        //     id="xpack.ml.calendarsEdit.calendarForm.eventsLabel"
        //     defaultMessage="Events"
        //   />
        // }
        fullWidth
      >
        <>
          <DstEventGenerator addEvents={addEvents} />
          <EventsTable
            eventsList={eventsList}
            onDeleteClick={onEventDelete}
            showImportModal={showImportModal}
            showNewEventModal={showNewEventModal}
            loading={loading}
            saving={saving}
            showSearchBar={false}
          />
        </>
      </EuiFormRow>
      <EuiSpacer size="l" />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton isDisabled={saving} onClick={redirectToCalendarsManagementPage}>
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
