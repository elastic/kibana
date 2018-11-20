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

// import { ml } from '../../../services/ml_api_service';
// import { EventsTable } from './events_table.js'

export class CalendarForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      calendarId: '',
      description: '',
      selectedJobOptions: [],
      selectedGroupOptions: [],
    };
  }

  onSave = () => {
    // grab the values from the state and send to
    // ml endpoint
  }

  onCancel = () => {
    // go back to calendar_list view
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

  onCalendarIdChange = e => {
    this.setState({
      calendarId: e.target.value,
    });
  };

  onDescriptionChange = e => {
    this.setState({
      description: e.target.value,
    });
  };

  // job and group options to be passed in via props.
  // new_calendar.js does call to api for data
  render() {
    return (
      <EuiForm>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiButton
              fill
              onClick={this.onSave}
            >
              Save
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={this.onCancel}
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
            value={this.state.calendarId}
            onChange={this.onCalendarIdChange}
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
          />
        </EuiFormRow>

        <EuiFormRow
          label="Jobs"
          fullWidth
        >
          <EuiComboBox
            fullWidth
            options={[
              { label: 'Job one' },
              { label: 'Job two' },
              { label: 'Job three' },
            ]}
            selectedOptions={this.state.selectedJobOptions}
            onChange={this.onJobSelection}
          />
        </EuiFormRow>

        <EuiFormRow
          label="Groups"
          fullWidth
        >
          <EuiComboBox
            options={[
              { label: 'Group one' },
              { label: 'Group two' },
              { label: 'Group three' },
            ]}
            selectedOptions={this.state.selectedGroupOptions}
            onChange={this.onGroupSelection}
          />
        </EuiFormRow>
        {/* <EventsTable /> */}
      </EuiForm>
    );
  }
}
