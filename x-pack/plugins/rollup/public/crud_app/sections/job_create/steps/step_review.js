/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiErrorBoundary, EuiSpacer, EuiTab, EuiTabs, EuiTitle } from '@elastic/eui';

import { serializeJob } from '../../../services';

import {
  JobDetails,
  JOB_DETAILS_TAB_SUMMARY,
  JOB_DETAILS_TAB_TERMS,
  JOB_DETAILS_TAB_HISTOGRAM,
  JOB_DETAILS_TAB_METRICS,
  JOB_DETAILS_TAB_REQUEST,
  tabToHumanizedMap,
} from '../../components';

const JOB_DETAILS_TABS = [
  JOB_DETAILS_TAB_SUMMARY,
  JOB_DETAILS_TAB_TERMS,
  JOB_DETAILS_TAB_HISTOGRAM,
  JOB_DETAILS_TAB_METRICS,
  JOB_DETAILS_TAB_REQUEST,
];

export class StepReview extends Component {
  static propTypes = {
    job: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      selectedTab: JOB_DETAILS_TABS[0],
    };
  }

  selectTab = (tab) => {
    this.setState({
      selectedTab: tab,
    });
  };

  renderTabs() {
    const { selectedTab } = this.state;
    const { job } = this.props;

    const renderedTabs = [];

    JOB_DETAILS_TABS.forEach((tab, index) => {
      if (tab === JOB_DETAILS_TAB_TERMS && !job.terms.length) {
        return;
      }

      if (tab === JOB_DETAILS_TAB_HISTOGRAM && !job.histogram.length) {
        return;
      }

      if (tab === JOB_DETAILS_TAB_METRICS && !job.metrics.length) {
        return;
      }

      const isSelected = tab === selectedTab;

      renderedTabs.push(
        <EuiTab
          onClick={() => this.selectTab(tab)}
          isSelected={isSelected}
          data-test-subj="stepReviewTab"
          key={index}
        >
          {tabToHumanizedMap[tab]}
        </EuiTab>
      );
    });

    if (!renderedTabs.length === 1) {
      return null;
    }

    return (
      <Fragment>
        <EuiTabs>{renderedTabs}</EuiTabs>
        <EuiSpacer size="m" />
      </Fragment>
    );
  }

  render() {
    const { job } = this.props;
    const { selectedTab } = this.state;
    const json = serializeJob(job);
    const endpoint = `PUT _rollup/job/${job.id}`;

    return (
      <Fragment>
        <EuiTitle data-test-subj="rollupJobCreateReviewTitle">
          <h2>
            <FormattedMessage
              id="xpack.rollupJobs.create.stepReviewTitle"
              defaultMessage="Review details for '{jobId}'"
              values={{ jobId: job.id }}
            />
          </h2>
        </EuiTitle>

        {this.renderTabs()}

        <EuiErrorBoundary>
          <JobDetails job={job} json={json} endpoint={endpoint} tab={selectedTab} />
        </EuiErrorBoundary>
      </Fragment>
    );
  }
}
