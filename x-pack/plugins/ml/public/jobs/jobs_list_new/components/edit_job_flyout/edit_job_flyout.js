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
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  // EuiSpacer,
  // EuiTabs,
  // EuiTab,
  // EuiText,
  // EuiTextColor,
  // EuiTabbedContent,
} from '@elastic/eui';

import { JobDetails, Detectors, Datafeed } from './tabs';
import { saveJob, loadJobDetails } from './edit_utils';
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
    };

    if (typeof this.props.showFunction === 'function') {
      this.props.showFunction(this.showFlyout);
    }

    this.refreshJobs = this.props.refreshJobs;
  }

  closeModal = () => {
    this.setState({ isModalVisible: false });
  }

  showFlyout = (jobLite) => {
    const hasDatafeed = jobLite.hasDatafeed;
    loadJobDetails(jobLite.id)
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

    this.setState({
      job,
      hasDatafeed,
      jobDescription: job.description,
      jobGroups: job.groups,
      jobModelMemoryLimit: mml,
      jobDetectors: detectors,
      jobDetectorDescriptions: detectors.map(d => d.detector_description),
      jobBucketSpan: bucketSpan,
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
        this.closeModal();
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
        datafeedQuery,
        datafeedQueryDelay,
        datafeedFrequency,
        datafeedScrollSize,
      } = this.state;

      // const tabs = [{
      //   id: 'job-details',
      //   name: 'Job details',
      //   content: <JobDetails
      //     jobDescription={jobDescription}
      //     jobGroups={jobGroups}
      //     jobModelMemoryLimit={jobModelMemoryLimit}
      //     setJobDetails={this.setJobDetails}
      //   />,
      // }, {
      //   id: 'detectors',
      //   name: 'Detectors',
      //   content: <div />,
      // }, {
      //   id: 'datafeed',
      //   name: 'Datafeed',
      //   content: <div />,
      // }, {
      //   id: 'custom-urls',
      //   name: 'Custom URLs',
      //   content: <div />,
      // }
      // ];

      flyout = (
        <EuiFlyout
          // ownFocus
          onClose={this.closeModal}
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
            {/* <EuiTabbedContent
              tabs={tabs}
              initialSelectedTab={tabs[0]}
              onTabClick={(tab) => { console.log('clicked tab', tab); }}
            /> */}
            <EuiTitle size="s">
              <h3>Job details</h3>
            </EuiTitle>

            <JobDetails
              jobDescription={jobDescription}
              jobGroups={jobGroups}
              jobModelMemoryLimit={jobModelMemoryLimit}
              setJobDetails={this.setJobDetails}
            />

            <EuiTitle size="s">
              <h3>Detectors</h3>
            </EuiTitle>
            <Detectors
              jobDetectors={jobDetectors}
              jobDetectorDescriptions={jobDetectorDescriptions}
              setDetectorDescriptions={this.setDetectorDescriptions}
            />

            <EuiTitle size="s">
              <h3>Datafeed</h3>
            </EuiTitle>
            <Datafeed
              datafeedQuery={datafeedQuery}
              datafeedQueryDelay={datafeedQueryDelay}
              datafeedFrequency={datafeedFrequency}
              datafeedScrollSize={datafeedScrollSize}
              jobBucketSpan={jobBucketSpan}
              setDatafeed={this.setDatafeed}
            />

          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="cross"
                  onClick={this.closeModal}
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
