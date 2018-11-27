/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React, {
  Component
} from 'react';
import { PropTypes } from 'prop-types';

import {
  EuiPage,
  EuiPageContent,
  EuiOverlayMask,
} from '@elastic/eui';

import chrome from 'ui/chrome';
import { getCalendarSettingsData, validateCalendarId } from './utils';
import { CalendarForm } from './calendar_form';
import { NewEventModal } from './new_event_modal';
import { ml } from 'plugins/ml/services/ml_api_service';
// import { checkGetJobsPrivilege } from 'plugins/ml/privilege/check_privilege';

export class NewCalendar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isNewEventModalVisible: false,
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
    };
  }

  componentDidMount() {
    this.formSetup();
  }

  // TODO: add some error handling - toast on error with try again message
  formSetup() {
    getCalendarSettingsData()
      .then(({ jobIds, groupIds, calendars }) => {
        const jobIdOptions = jobIds.map((jobId) => ({ label: jobId }));
        const groupIdOptions = groupIds.map((groupId) => ({ label: groupId }));

        let selectedCalendar;
        let formCalendarId = '';
        const selectedJobOptions = [];
        const selectedGroupOptions = [];
        let eventsList = [];
        // Better to build a map with calendar id as keys for constant lookup time?
        if (this.props.calendarId !== undefined) {
          selectedCalendar = calendars.find((cal) => cal.calendar_id === this.props.calendarId);

          if (selectedCalendar) {
            formCalendarId = selectedCalendar.calendar_id;
            eventsList = selectedCalendar.events;
            selectedCalendar.job_ids.forEach(id => {
              if (jobIds.find((jobId) => jobId === id)) {
                selectedJobOptions.push({ label: id });
              } else if (groupIds.find((groupId) => groupId === id)) {
                selectedGroupOptions.push({ label: id });
              }
            });
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
          selectedCalendar
        });
      })
      .catch((err) => {
        console.log(err);
        this.setState({ loading: false });
      });
  }

  // Validate and save - NOTE: can we validate calendar id with just the form on the front-end?
  // TODO: add error handling - toast to show some try again message
  onCreate = () => {
    const calendar = this.setUpCalendarForApi();

    if (validateCalendarId(calendar.calendarId, { calendarId: { valid: true } })) {
      this.setState({ saving: true });

      ml.addCalendar(calendar)
        .then(() => {
          window.location = `${chrome.getBasePath()}/app/ml#/settings/calendars_list`;
        })
        .catch((error) => {
          console.log('Error saving calendar', error);
          this.setState({ saving: false });
        });
    } else {
      // Trigger validation error message for form
    }
  }

  // TODO: add error handling - toast to show some try again message
  onEdit = () => {
    const calendar = this.setUpCalendarForApi();
    this.setState({ saving: true });
    ml.updateCalendar(calendar)
      .then(() => {
        window.location = `${chrome.getBasePath()}/app/ml#/settings/calendars_list`;
      })
      .catch((error) => {
        console.log('Error saving calendar', error);
        this.setState({ saving: false });
      });
  }

  setUpCalendarForApi = () => {
    const {
      formCalendarId,
      description,
      events,
      selectedGroupOptions,
      selectedJobOptions,
    } = this.state;

    const jobIds = selectedJobOptions.map((option) => option.label);
    const groupIds = selectedGroupOptions.map((option) => option.label);

    // set up event
    // const events = events.map((event) => {
    //   return {
    //     description: event.description,
    //     start_time: event.start_time,
    //     end_time: event.end_time
    //   };
    // });

    // set up calendar
    const calendar = {
      calendarId: formCalendarId,
      description,
      events,
      job_ids: [...jobIds, ...groupIds]
    };

    return calendar;
  }

  onCreateGroupOption = (newGroup) => {
    const newOption = {
      label: newGroup,
    };
    // Select the option.
    this.setState(prevState => ({
      selectedGroupOptions: prevState.selectedGroupOptions.concat(newOption),
    }));
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
    this.setState({
      formCalendarId: e.target.value,
    });
  };

  onDescriptionChange = (e) => {
    this.setState({
      description: e.target.value,
    });
  };

  onEventDelete = (eventId) => {
    this.setState(prevState => ({
      events: prevState.events.filter(event => event.event_id !== eventId)
    }));
  }

  closeNewEventModal = () => {
    this.setState({ isNewEventModalVisible: false });
  }

  showNewEventModal = () => {
    this.setState({ isNewEventModalVisible: true });
  }

  addEvent = (event) => {
    this.setState(prevState => ({
      events: [...prevState.events, event],
      isNewEventModalVisible: false
    }));
  }

  render() {
    const {
      events,
      isNewEventModalVisible,
      formCalendarId,
      description,
      groupIdOptions,
      jobIdOptions,
      saving,
      selectedCalendar,
      selectedJobOptions,
      selectedGroupOptions
    } = this.state;

    let newEventModal = '';

    if (isNewEventModalVisible) {
      newEventModal = (
        <EuiOverlayMask>
          <NewEventModal
            addEvent={this.addEvent}
            closeModal={this.closeNewEventModal}
          />
        </EuiOverlayMask>
      );
    }

    return (
      <EuiPage className="ml-calendar-form">
        <EuiPageContent
          className="ml-calendar-form-content"
          verticalPosition="center"
          horizontalPosition="center"
        >
          <CalendarForm
            calendarId={selectedCalendar ? selectedCalendar.calendar_id : formCalendarId}
            description={selectedCalendar ? selectedCalendar.description : description}
            eventsList={events}
            groupIds={groupIdOptions}
            isEdit={selectedCalendar !== undefined}
            jobIds={jobIdOptions}
            onCalendarIdChange={this.onCalendarIdChange}
            onCreate={this.onCreate}
            onDescriptionChange={this.onDescriptionChange}
            onEdit={this.onEdit}
            onEventDelete={this.onEventDelete}
            onGroupSelection={this.onGroupSelection}
            onJobSelection={this.onJobSelection}
            saving={saving}
            selectedGroupOptions={selectedGroupOptions}
            selectedJobOptions={selectedJobOptions}
            onCreateGroupOption={this.onCreateGroupOption}
            showNewEventModal={this.showNewEventModal}
          />
        </EuiPageContent>
        {newEventModal}
      </EuiPage>
    );
  }
}

NewCalendar.propTypes = {
  calendarId: PropTypes.string,
};
