/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
import React, {
  Component,
} from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTabbedContent,
} from '@elastic/eui';

import { JobDetails, Detectors, Datafeed, CustomUrls } from './tabs';
import { saveJob } from './edit_utils';
import { loadFullJob } from '../utils';
import { toastNotifications } from 'ui/notify';

export class EditJobFlyout extends Component {
  constructor(props) {
    super(props);

    this.state = {
      job: {},
      hasDatafeed: false,
      isModalVisible: false,
      jobDescription: '',
      jobGroups: [],
      jobModelMemoryLimit: '',
      jobDetectors: [],
      jobDetectorDescriptions: [],
      jobCustomUrls: [],
      datafeedQuery: '',
      datafeedQueryDelay: '',
      datafeedFrequency: '',
      datafeedScrollSize: '',
    };

    if (typeof this.props.showFunction === 'function') {
      this.props.showFunction(this.showFlyout);
    }

    this.refreshJobs = this.props.refreshJobs;
  }

  closeFlyout = () => {
    this.setState({ isModalVisible: false });
  }

  showFlyout = (jobLite) => {
    const hasDatafeed = jobLite.hasDatafeed;
    loadFullJob(jobLite.id)
    	.then((job) => {
        this.extractJob(job, hasDatafeed);
        this.setState({
          job,
          isModalVisible: true,
        });
      })
      .catch((error) => {
        console.error(error);
      });
  }

  extractJob(job, hasDatafeed) {
    const mml = (job.analysis_limits && job.analysis_limits.model_memory_limit) ?
      job.analysis_limits.model_memory_limit :
      '';
    const detectors = (job.analysis_config && job.analysis_config.detectors) ?
      job.analysis_config.detectors :
      '';

    const bucketSpan = (job.analysis_config) ? job.analysis_config.bucket_span : '';

    const datafeedConfig = job.datafeed_config;
    const frequency = (datafeedConfig.frequency !== undefined) ? datafeedConfig.frequency : '';
    const customUrls = (job.custom_settings && job.custom_settings.custom_urls) ?
      job.custom_settings.custom_urls : [];

    this.setState({
      job,
      hasDatafeed,
      jobDescription: job.description,
      jobGroups: job.groups,
      jobModelMemoryLimit: mml,
      jobDetectors: detectors,
      jobDetectorDescriptions: detectors.map(d => d.detector_description),
      jobBucketSpan: bucketSpan,
      jobCustomUrls: customUrls,
      datafeedQuery: (hasDatafeed) ? JSON.stringify(datafeedConfig.query, null, 2) : '',
      datafeedQueryDelay: (hasDatafeed) ? datafeedConfig.query_delay : '',
      datafeedFrequency: (hasDatafeed) ? frequency : '',
      datafeedScrollSize: (hasDatafeed) ? +datafeedConfig.scroll_size : '',
    });
  }

  setJobDetails = (jobDetails) => {
    this.setState({
      ...jobDetails
    });
  }

  setDetectorDescriptions = (jobDetectorDescriptions) => {
    this.setState({
      ...jobDetectorDescriptions
    });
  }

  setDatafeed = (datafeed) => {
    this.setState({
      ...datafeed
    });
  }

  setCustomUrls = (jobCustomUrls) => {
    this.setState({
      ...jobCustomUrls
    });
  }


  save = () => {
    const newJobData = {
      description: this.state.jobDescription,
      groups: this.state.jobGroups,
      mml: this.state.jobModelMemoryLimit,
      detectorDescriptions: this.state.jobDetectorDescriptions,
      datafeedQuery: this.state.datafeedQuery,
      datafeedQueryDelay: this.state.datafeedQueryDelay,
      datafeedFrequency: this.state.datafeedFrequency,
      datafeedScrollSize: this.state.datafeedScrollSize,
    };

    saveJob(this.state.job, newJobData)
      .then(() => {
        toastNotifications.addSuccess(`Changes to ${this.state.job.job_id} saved`);
        this.refreshJobs();
        this.closeFlyout();
      })
      .catch((error) => {
        console.error(error);
        toastNotifications.addDanger(`Could not save changes to ${this.state.job.job_id}`);
      });
  }

  render() {
    let flyout;

    if (this.state.isModalVisible) {
      const {
        job,
        jobDescription,
        jobGroups,
        jobModelMemoryLimit,
        jobDetectors,
        jobDetectorDescriptions,
        jobBucketSpan,
        jobCustomUrls,
        datafeedQuery,
        datafeedQueryDelay,
        datafeedFrequency,
        datafeedScrollSize,
      } = this.state;

      const tabs = [{
        id: 'job-details',
        name: 'Job details',
        content: <JobDetails
          jobDescription={jobDescription}
          jobGroups={jobGroups}
          jobModelMemoryLimit={jobModelMemoryLimit}
          setJobDetails={this.setJobDetails}
        />,
      }, {
        id: 'detectors',
        name: 'Detectors',
        content: <Detectors
          jobDetectors={jobDetectors}
          jobDetectorDescriptions={jobDetectorDescriptions}
          setDetectorDescriptions={this.setDetectorDescriptions}
        />,
      }, {
        id: 'datafeed',
        name: 'Datafeed',
        content: <Datafeed
          datafeedQuery={datafeedQuery}
          datafeedQueryDelay={datafeedQueryDelay}
          datafeedFrequency={datafeedFrequency}
          datafeedScrollSize={datafeedScrollSize}
          jobBucketSpan={jobBucketSpan}
          setDatafeed={this.setDatafeed}
        />,
      }, {
        id: 'custom-urls',
        name: 'Custom URLs',
        content: <CustomUrls
          job={job}
          jobCustomUrls={jobCustomUrls}
          setCustomUrls={this.setCustomUrls}
        />,
      }
      ];

      flyout = (
        <EuiFlyout
          // ownFocus
          onClose={this.closeFlyout}
          size="m"
        >
          <EuiFlyoutHeader>
            <EuiTitle>
              <h2>
                Edit {job.id}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>

            <EuiTabbedContent
              tabs={tabs}
              initialSelectedTab={tabs[0]}
              onTabClick={() => { }}
            />

          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="cross"
                  onClick={this.closeFlyout}
                  flush="left"
                >
                  Close
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={this.save}
                  fill
                >
                  Save
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      );
    }

    return (
      <div>
        {flyout}
      </div>
    );

  }
}

EditJobFlyout.propTypes = {
  showFunction: PropTypes.func.isRequired,
  refreshJobs: PropTypes.func.isRequired,
};
