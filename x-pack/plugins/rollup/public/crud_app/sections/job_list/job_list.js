/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiTitle,
} from '@elastic/eui';

import { CRUD_APP_BASE_PATH } from '../../constants';
import { getRouterLinkProps, extractQueryParams } from '../../services';

import {
  JobTable,
} from './job_table';

import {
  DetailPanel,
} from './detail_panel';

const REFRESH_RATE_MS = 30000;

export class JobListUi extends Component {
  static propTypes = {
    loadJobs: PropTypes.func,
    openDetailPanel: PropTypes.func,
  }

  static getDerivedStateFromProps(props) {
    const {
      openDetailPanel,
      history: {
        location: {
          search,
        },
      },
    } = props;

    const { job: jobId } = extractQueryParams(search);

    // Show deeplinked job whenever jobs get loaded or the URL changes.
    if (jobId != null) {
      openDetailPanel(jobId);
    }

    return null;
  }

  constructor(props) {
    super(props);

    this.state = {};

    props.loadJobs();
  }

  componentDidMount() {
    this.interval = setInterval(this.props.loadJobs, REFRESH_RATE_MS);
  }

  componentWillUnmount() {
    clearInterval(this.interval);

    // Close the panel, otherwise it will default to already being open when we navigate back to
    // this page.
    this.props.closeDetailPanel();
  }

  render() {
    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent>
            <EuiPageContentHeader>
              <EuiPageContentHeaderSection>
                <EuiTitle size="l">
                  <h1>
                    <FormattedMessage
                      id="xpack.rollupJobs.jobList.title"
                      defaultMessage="Rollup jobs"
                    />
                  </h1>
                </EuiTitle>
              </EuiPageContentHeaderSection>

              <EuiPageContentHeaderSection>
                <EuiButton fill {...getRouterLinkProps(`${CRUD_APP_BASE_PATH}/create`)}>
                  <h1>
                    <FormattedMessage
                      id="xpack.rollupJobs.jobList.createButton.label"
                      defaultMessage="Create rollup job"
                    />
                  </h1>
                </EuiButton>
              </EuiPageContentHeaderSection>
            </EuiPageContentHeader>

            <JobTable />

            <DetailPanel />
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

export const JobList = injectI18n(JobListUi);

