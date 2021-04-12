/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import { PropTypes } from 'prop-types';

import { i18n } from '@kbn/i18n';

import { EuiPage, EuiPageBody, EuiPageContent } from '@elastic/eui';

import { NavigationMenu } from '../../../components/navigation_menu';

import { getCalendarSettingsData, validateCalendarId } from './utils';
import { CalendarForm } from './calendar_form';
import { NewEventModal } from './new_event_modal';
import { ImportModal } from './import_modal';
import { ml } from '../../../services/ml_api_service';
import { withKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { GLOBAL_CALENDAR } from '../../../../../common/constants/calendars';
import { ML_PAGES } from '../../../../../common/constants/ml_url_generator';
import { getDocLinks } from '../../../util/dependency_cache';
import { HelpMenu } from '../../../components/help_menu';

class NewCalendarUI extends Component {
  static propTypes = {
    calendarId: PropTypes.string,
    canCreateCalendar: PropTypes.bool.isRequired,
    canDeleteCalendar: PropTypes.bool.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      isNewEventModalVisible: false,
      isImportModalVisible: false,
      isNewCalendarIdValid: null,
      loading: true,
      jobIds: [],
      jobIdOptions: [],
      groupIds: [],
      groupIdOptions: [],
      calendars: [],
      formCalendarId: '',
      description: '',
      selectedJobOptions: [],
      selectedGroupOptions: [],
      events: [],
      saving: false,
      selectedCalendar: undefined,
      isGlobalCalendar: false,
    };
  }

  componentDidMount() {
    this.formSetup();
  }

  returnToCalendarsManagementPage = async () => {
    const {
      services: {
        http: { basePath },
        application: { navigateToUrl },
      },
    } = this.props.kibana;
    await navigateToUrl(`${basePath.get()}/app/ml/${ML_PAGES.CALENDARS_MANAGE}`, true);
  };

  async formSetup() {
    try {
      const { jobIds, groupIds, calendars } = await getCalendarSettingsData();

      const jobIdOptions = jobIds.map((jobId) => ({ label: jobId }));
      const groupIdOptions = groupIds.map((groupId) => ({ label: groupId }));

      const selectedJobOptions = [];
      const selectedGroupOptions = [];
      let eventsList = [];
      let selectedCalendar;
      let formCalendarId = '';
      let isGlobalCalendar = false;

      // Editing existing calendar.
      if (this.props.calendarId !== undefined) {
        selectedCalendar = calendars.find((cal) => cal.calendar_id === this.props.calendarId);

        if (selectedCalendar) {
          formCalendarId = selectedCalendar.calendar_id;
          eventsList = selectedCalendar.events;

          if (selectedCalendar.job_ids.includes(GLOBAL_CALENDAR)) {
            isGlobalCalendar = true;
          } else {
            selectedCalendar.job_ids.forEach((id) => {
              if (jobIds.find((jobId) => jobId === id)) {
                selectedJobOptions.push({ label: id });
              } else if (groupIds.find((groupId) => groupId === id)) {
                selectedGroupOptions.push({ label: id });
              }
            });
          }
        }
      }

      this.setState({
        events: eventsList,
        formCalendarId,
        jobIds,
        jobIdOptions,
        groupIds,
        groupIdOptions,
        calendars,
        loading: false,
        selectedJobOptions,
        selectedGroupOptions,
        selectedCalendar,
        isGlobalCalendar,
      });
    } catch (error) {
      console.log(error);
      this.setState({ loading: false });
      const { toasts } = this.props.kibana.services.notifications;
      toasts.addDanger(
        i18n.translate('xpack.ml.calendarsEdit.errorWithLoadingCalendarFromDataErrorMessage', {
          defaultMessage: 'An error occurred loading calendar form data. Try refreshing the page.',
        })
      );
    }
  }

  isDuplicateId = () => {
    const { calendars, formCalendarId } = this.state;

    for (let i = 0; i < calendars.length; i++) {
      if (calendars[i].calendar_id === formCalendarId) {
        return true;
      }
    }

    return false;
  };

  onCreate = async () => {
    const { formCalendarId } = this.state;

    if (this.isDuplicateId()) {
      const { toasts } = this.props.kibana.services.notifications;
      toasts.addDanger(
        i18n.translate('xpack.ml.calendarsEdit.canNotCreateCalendarWithExistingIdErrorMessag', {
          defaultMessage: 'Cannot create calendar with id [{formCalendarId}] as it already exists.',
          values: { formCalendarId },
        })
      );
    } else {
      const calendar = this.setUpCalendarForApi();
      this.setState({ saving: true });

      try {
        await ml.addCalendar(calendar);
        await this.returnToCalendarsManagementPage();
      } catch (error) {
        console.log('Error saving calendar', error);
        this.setState({ saving: false });
        const { toasts } = this.props.kibana.services.notifications;
        toasts.addDanger(
          i18n.translate('xpack.ml.calendarsEdit.errorWithCreatingCalendarErrorMessage', {
            defaultMessage: 'An error occurred creating calendar {calendarId}',
            values: { calendarId: calendar.calendarId },
          })
        );
      }
    }
  };

  onEdit = async () => {
    const calendar = this.setUpCalendarForApi();
    this.setState({ saving: true });

    try {
      await ml.updateCalendar(calendar);
      await this.returnToCalendarsManagementPage();
    } catch (error) {
      console.log('Error saving calendar', error);
      this.setState({ saving: false });
      const { toasts } = this.props.kibana.services.notifications;
      toasts.addDanger(
        i18n.translate('xpack.ml.calendarsEdit.errorWithUpdatingCalendarErrorMessage', {
          defaultMessage:
            'An error occurred saving calendar {calendarId}. Try refreshing the page.',
          values: { calendarId: calendar.calendarId },
        })
      );
    }
  };

  setUpCalendarForApi = () => {
    const {
      formCalendarId,
      description,
      events,
      selectedGroupOptions,
      selectedJobOptions,
      isGlobalCalendar,
    } = this.state;

    const allIds = isGlobalCalendar
      ? [GLOBAL_CALENDAR]
      : [
          ...selectedJobOptions.map((option) => option.label),
          ...selectedGroupOptions.map((option) => option.label),
        ];

    // Reduce events to fields expected by api
    const eventsToSave = events.map((event) => ({
      description: event.description,
      start_time: event.start_time,
      end_time: event.end_time,
    }));

    // set up calendar
    const calendar = {
      calendarId: formCalendarId,
      description,
      events: eventsToSave,
      job_ids: allIds,
    };

    return calendar;
  };

  onCreateGroupOption = (newGroup) => {
    const newOption = {
      label: newGroup,
    };
    // Select the option.
    this.setState((prevState) => ({
      selectedGroupOptions: prevState.selectedGroupOptions.concat(newOption),
    }));
  };

  onGlobalCalendarChange = ({ currentTarget }) => {
    this.setState({
      isGlobalCalendar: currentTarget.checked,
    });
  };

  onJobSelection = (selectedJobOptions) => {
    this.setState({
      selectedJobOptions,
    });
  };

  onGroupSelection = (selectedGroupOptions) => {
    this.setState({
      selectedGroupOptions,
    });
  };

  onCalendarIdChange = (e) => {
    const isValid = validateCalendarId(e.target.value);

    this.setState({
      formCalendarId: e.target.value,
      isNewCalendarIdValid: isValid,
    });
  };

  onDescriptionChange = (e) => {
    this.setState({
      description: e.target.value,
    });
  };

  showImportModal = () => {
    this.setState((prevState) => ({
      isImportModalVisible: !prevState.isImportModalVisible,
    }));
  };

  closeImportModal = () => {
    this.setState({
      isImportModalVisible: false,
    });
  };

  onEventDelete = (eventId) => {
    this.setState((prevState) => ({
      events: prevState.events.filter((event) => event.event_id !== eventId),
    }));
  };

  closeNewEventModal = () => {
    this.setState({ isNewEventModalVisible: false });
  };

  showNewEventModal = () => {
    this.setState({ isNewEventModalVisible: true });
  };

  addEvent = (event) => {
    this.setState((prevState) => ({
      events: [...prevState.events, event],
      isNewEventModalVisible: false,
    }));
  };

  addImportedEvents = (events) => {
    this.setState((prevState) => ({
      events: [...prevState.events, ...events],
      isImportModalVisible: false,
    }));
  };

  render() {
    const {
      events,
      isNewEventModalVisible,
      isImportModalVisible,
      isNewCalendarIdValid,
      formCalendarId,
      description,
      groupIdOptions,
      jobIdOptions,
      saving,
      selectedCalendar,
      selectedJobOptions,
      selectedGroupOptions,
      isGlobalCalendar,
    } = this.state;

    const helpLink = getDocLinks().links.ml.calendars;

    let modal = '';

    if (isNewEventModalVisible) {
      modal = <NewEventModal addEvent={this.addEvent} closeModal={this.closeNewEventModal} />;
    } else if (isImportModalVisible) {
      modal = (
        <ImportModal
          addImportedEvents={this.addImportedEvents}
          closeImportModal={this.closeImportModal}
        />
      );
    }

    return (
      <Fragment>
        <NavigationMenu tabId="settings" />
        <EuiPage className="mlCalendarEditForm" data-test-subj="mlPageCalendarEdit">
          <EuiPageBody>
            <EuiPageContent
              className="mlCalendarEditForm__content"
              verticalPosition="center"
              horizontalPosition="center"
            >
              <CalendarForm
                calendarId={selectedCalendar ? selectedCalendar.calendar_id : formCalendarId}
                canCreateCalendar={this.props.canCreateCalendar}
                canDeleteCalendar={this.props.canDeleteCalendar}
                description={selectedCalendar ? selectedCalendar.description : description}
                eventsList={events}
                groupIds={groupIdOptions}
                isEdit={selectedCalendar !== undefined}
                isNewCalendarIdValid={
                  selectedCalendar || isNewCalendarIdValid === null ? true : isNewCalendarIdValid
                }
                jobIds={jobIdOptions}
                onCalendarIdChange={this.onCalendarIdChange}
                onCreate={this.onCreate}
                onDescriptionChange={this.onDescriptionChange}
                onEdit={this.onEdit}
                onEventDelete={this.onEventDelete}
                onGroupSelection={this.onGroupSelection}
                showImportModal={this.showImportModal}
                onJobSelection={this.onJobSelection}
                saving={saving}
                selectedGroupOptions={selectedGroupOptions}
                selectedJobOptions={selectedJobOptions}
                onCreateGroupOption={this.onCreateGroupOption}
                showNewEventModal={this.showNewEventModal}
                isGlobalCalendar={isGlobalCalendar}
                onGlobalCalendarChange={this.onGlobalCalendarChange}
              />
            </EuiPageContent>
            {modal}
          </EuiPageBody>
        </EuiPage>
        <HelpMenu docLink={helpLink} />
      </Fragment>
    );
  }
}

export const NewCalendar = withKibana(NewCalendarUI);
