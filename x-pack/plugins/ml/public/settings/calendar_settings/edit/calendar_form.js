/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React, {
  Component,
} from 'react';

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
import { ml } from 'plugins/ml/services/ml_api_service';
import { validateCalendarId } from './utils';
// import { EventsTable } from './events_table.js'

export class CalendarForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      calendarId: props.calendar ? props.calendar.calendar_id : '',
      description: props.calendar ? props.calendar.description : '',
      selectedJobOptions: [],
      selectedGroupOptions: [],
      events: [],
      saving: false,
    };
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
      // Trigger toast or something with validation error message
    }
  }

  onEdit = () => {
    // const calendar = this.setUpCalendarForApi();
    // hit update api
    // ml.updateCalendar(calendar).then().catch()
  }
  // TODO: Ability to create new group
  setUpCalendarForApi = () => {
    const {
      calendarId,
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
      calendarId,
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
      calendarId: e.target.value,
    });
  };

  onDescriptionChange = (e) => {
    this.setState({
      description: e.target.value,
    });
  };

  render() {
    const { jobIds, groupIds, calendar } = this.props;
    const { saving } = this.state;
    const isEdit = calendar !== undefined;

    return (
      <EuiForm>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={isEdit ? this.onEdit : this.onCreate}
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

        <EuiSpacer size="l" />

        <EuiFormRow
          label="Calendar ID"
          fullWidth
        >
          <EuiFieldText
            name="calendarId"
            fullWidth
            value={isEdit ? calendar.calendar_id : this.state.calendarId}
            onChange={this.onCalendarIdChange}
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
            value={this.state.description}
            onChange={this.onDescriptionChange}
            disabled={isEdit === true || saving === true}
          />
        </EuiFormRow>

        <EuiFormRow
          label="Jobs"
          fullWidth
        >
          <EuiComboBox
            fullWidth
            options={jobIds}
            selectedOptions={this.state.selectedJobOptions}
            onChange={this.onJobSelection}
            disabled={saving === true}
          />
        </EuiFormRow>

        <EuiFormRow
          label="Groups"
          fullWidth
        >
          <EuiComboBox
            fullWidth
            options={groupIds}
            selectedOptions={this.state.selectedGroupOptions}
            onChange={this.onGroupSelection}
            disabled={saving === true}
          />
        </EuiFormRow>
        {/* <EventsTable /> */}
      </EuiForm>
    );
  }
}
