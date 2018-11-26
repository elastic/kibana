/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React, {
  Component
} from 'react';

import {
  EuiPage,
  EuiPageContent,
} from '@elastic/eui';

import { getCalendarSettingsData } from './utils';
import { CalendarForm } from './calendar_form';
// import { checkGetJobsPrivilege } from 'plugins/ml/privilege/check_privilege';

export class NewCalendar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      jobIds: [],
      groupIds: [],
      calendars: []
    };
  }

  componentDidMount() {
    this.fetchData();
  }

  // TODO: add some error handling - toast on error with try again message
  fetchData() {
    getCalendarSettingsData()
      .then(({ jobIds, groupIds, calendars }) => {
        this.setState({ jobIds, groupIds, calendars, loading: false });
      })
      .catch((err) => {
        console.log(err);
        this.setState({ loading: false });
      });
  }

  render() {
    const { jobIds, groupIds, calendars } = this.state;
    let calendar;
    // Better to build a map with calendar id as keys for constant lookup time?
    if (this.props.calendarId !== undefined) {
      calendar = calendars.find((cal) => cal.calendar_id === this.props.calendarId);
    }

    return (
      <EuiPage className="ml-list-filter-lists">
        <EuiPageContent
          className="ml-list-filter-lists-content"
          verticalPosition="center"
          // horizontalPosition="center"
        >
          <CalendarForm
            calendar={calendar}
            jobIds={jobIds}
            groupIds={groupIds}
          />
        </EuiPageContent>
      </EuiPage>
    );
  }
}
