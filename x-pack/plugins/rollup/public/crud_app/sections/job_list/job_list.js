/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiButton,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { CRUD_APP_BASE_PATH } from '../../../../common/constants';

import { getRouterLinkProps } from '../../services';

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
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiTitle size="l">
                  <h1>Rollup jobs</h1>
                </EuiTitle>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButton fill {...getRouterLinkProps(`${CRUD_APP_BASE_PATH}/create`)}>
                  Create rollup job
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer />

            <JobTable />

            <DetailPanel />
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}
