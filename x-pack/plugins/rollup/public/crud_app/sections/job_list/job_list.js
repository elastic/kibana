/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  JobTable,
} from './job_table';

import {
  DetailPanel,
} from './detail_panel';

const REFRESH_RATE_MS = 30000;

export class JobList extends Component {
  static propTypes = {
    loadJobs: PropTypes.func,
  }

  componentWillMount() {
    this.props.loadJobs();
  }

  componentDidMount() {
    this.interval = setInterval(this.props.loadJobs, REFRESH_RATE_MS);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    return (
      <Fragment>
        <JobTable />
        <DetailPanel />
      </Fragment>
    );
  }
}
