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
} from '@elastic/eui';

import chrome from 'ui/chrome';
import { getCalendarSettingsData, validateCalendarId } from './utils';
import { CalendarForm } from './calendar_form';
import { ml } from 'plugins/ml/services/ml_api_service';
// import { checkGetJobsPrivilege } from 'plugins/ml/privilege/check_privilege';

export class NewCalendar extends Component {
  constructor(props) {
    super(props);
    this.state = {
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
        // Better to build a map with calendar id as keys for constant lookup time?
        if (this.props.calendarId !== undefined) {
          selectedCalendar = calendars.find((cal) => cal.calendar_id === this.props.calendarId);

          if (selectedCalendar) {
            formCalendarId = selectedCalendar.calendar_id;
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

  // TODO: Ability to create new group
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

  render() {
    const {
      formCalendarId,
      description,
      groupIdOptions,
      jobIdOptions,
      saving,
      selectedCalendar,
      selectedJobOptions,
      selectedGroupOptions
    } = this.state;

    return (
      <EuiPage className="ml-list-filter-lists">
        <EuiPageContent
          className="ml-list-filter-lists-content"
          verticalPosition="center"
        >
          <CalendarForm
            calendarId={selectedCalendar ? selectedCalendar.calendar_id : formCalendarId}
            description={selectedCalendar ? selectedCalendar.description : description}
            groupIds={groupIdOptions}
            isEdit={selectedCalendar !== undefined}
            jobIds={jobIdOptions}
            onCalendarIdChange={this.onCalendarIdChange}
            onCreate={this.onCreate}
            onDescriptionChange={this.onDescriptionChange}
            onEdit={this.onEdit}
            onGroupSelection={this.onGroupSelection}
            onJobSelection={this.onJobSelection}
            saving={saving}
            selectedGroupOptions={selectedGroupOptions}
            selectedJobOptions={selectedJobOptions}
          />
        </EuiPageContent>
      </EuiPage>
    );
  }
}

NewCalendar.propTypes = {
  calendarId: PropTypes.string,
};

// NewCalendar.defaultProps = {
//   calendarId: undefined
// };
