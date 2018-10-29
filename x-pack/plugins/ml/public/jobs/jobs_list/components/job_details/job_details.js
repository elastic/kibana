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
  EuiTabbedContent,
  EuiLoadingSpinner,
} from '@elastic/eui';

import './styles/main.less';

import { extractJobDetails } from './extract_job_details';
import { JsonPane } from './json_tab';
import { DatafeedPreviewPane } from './datafeed_preview_tab';
import { ForecastsTable } from './forecasts_table';
import { JobDetailsPane } from './job_details_pane';
import { JobMessagesPane } from './job_messages_pane';

export class JobDetails extends Component {
  constructor(props) {
    super(props);

    this.state = {};
    if (this.props.addYourself) {
      this.props.addYourself(props.jobId, this);
    }
  }

  componentWillUnmount() {
    this.props.removeYourself(this.props.jobId);
  }

  static getDerivedStateFromProps(props) {
    const { job, loading } = props;
    return { job, loading };
  }

  render() {
    const { job } = this.state;
    if (job === undefined) {
      return (
        <div className="job-loading-spinner"><EuiLoadingSpinner size="l"/></div>
      );
    } else {

      const {
        general,
        customUrl,
        node,
        detectors,
        influencers,
        analysisConfig,
        analysisLimits,
        dataDescription,
        datafeed,
        counts,
        modelSizeStats
      } = extractJobDetails(job);

      const tabs = [{
        id: 'job-settings',
        name: 'Job settings',
        content: <JobDetailsPane sections={[general, customUrl, node]} />,
        time: job.open_time
      }, {
        id: 'job-config',
        name: 'Job config',
        content: <JobDetailsPane sections={[detectors, influencers, analysisConfig, analysisLimits, dataDescription]} />,
      }, {
        id: 'datafeed',
        name: 'Datafeed',
        content: <JobDetailsPane sections={[datafeed]} />,
      }, {
        id: 'counts',
        name: 'Counts',
        content: <JobDetailsPane sections={[counts, modelSizeStats]} />,
      }, {
        id: 'json',
        name: 'JSON',
        content: <JsonPane job={job} />,
      }, {
        id: 'job-messages',
        name: 'Job messages',
        content: <JobMessagesPane job={job} />,
      }, {
        id: 'datafeed-preview',
        name: 'Datafeed preview',
        content: <DatafeedPreviewPane job={job} />,
      }, {
        id: 'forecasts',
        name: 'Forecasts',
        content: <ForecastsTable job={job} />,
      }
      ];

      return (
        <div className="tab-contents">
          <EuiTabbedContent
            tabs={tabs}
            initialSelectedTab={tabs[0]}
            onTabClick={() => { }}
          />
        </div>
      );
    }
  }
}
JobDetails.propTypes = {
  jobId: PropTypes.string.isRequired,
  job: PropTypes.object,
  addYourself: PropTypes.func.isRequired,
  removeYourself: PropTypes.func.isRequired,
};
