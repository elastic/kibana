/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
import React, {
  Component
} from 'react';

import {
  EuiSpacer,
  EuiBasicTable,
} from '@elastic/eui';

import { formatDate } from '@elastic/eui/lib/services/format';
import { ml } from 'plugins/ml/services/ml_api_service';
import { JobIcon } from '../job_message_icon';

const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export class JobMessagesPane extends Component {

  constructor(props) {
    super(props);

    this.state = {
      messages: []
    };
    this.jobId = props.job.job_id;
  }

  componentDidMount() {
    ml.jobs.jobAuditMessages(this.jobId)
      .then((messages) => {
        this.setState({ messages });
      })
      .catch((error) => {
        console.log('Job messages could not be loaded', error);
      });
  }

  render() {
    const { messages } = this.state;
    const columns = [{
      name: '',
      render: item => (<JobIcon message={item} />)
    }, {
      name: 'Time',
      render: item => formatDate(item.timestamp, TIME_FORMAT)
    }, {
      field: 'node_name',
      name: 'Node',
    }, {
      field: 'message',
      name: 'Message',
    }
    ];
    return (
      <React.Fragment>
        <EuiSpacer size="s" />
        <div className="job-messages-table">
          <EuiBasicTable
            items={messages}
            columns={columns}
          />
        </div>
      </React.Fragment>
    );
  }
}
JobMessagesPane.propTypes = {
  job: PropTypes.object.isRequired,
};

