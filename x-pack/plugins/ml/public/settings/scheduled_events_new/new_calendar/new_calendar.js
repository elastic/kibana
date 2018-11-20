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

// import { ml } from '../../../services/ml_api_service';
import { CalendarForm } from './calendar_form';
// import { checkGetJobsPrivilege } from 'plugins/ml/privilege/check_privilege';

export class NewCalendar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
    };
  }

  createCalendar = () => {
    // TODO hit ml endpoint to create/update calendar? or separate?
  }

  render() {
    return (
      <EuiPage className="ml-list-filter-lists">
        <EuiPageContent
          className="ml-list-filter-lists-content"
          verticalPosition="center"
          horizontalPosition="center"
        >
          <CalendarForm />
        </EuiPageContent>
      </EuiPage>
    );
  }
}
