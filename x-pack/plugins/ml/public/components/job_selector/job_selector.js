/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React, { useState, useEffect } from 'react';
import { PropTypes } from 'prop-types';

import { mlJobService } from '../../services/job_service';
import { JobSelectorContent } from './job_selector_content';

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiButton,
  EuiText,
  EuiTitle
} from '@elastic/eui';


export function JobSelector({
  jobSelectService,
  selectedJobIds,
  singleSelection,
  timeseriesOnly
}) {
  const [jobIds, setJobIds] = useState(selectedJobIds);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  function closeFlyout() {
    setIsFlyoutVisible(false);
  }

  function showFlyout() {
    setIsFlyoutVisible(true);
  }

  // TODO: ensure this only runs once
  useEffect(() => {
    if (jobIds.length === 0) {
      let selected = [];
      mlJobService.loadJobs()
        .then((resp) => {
          if (resp.jobs.length) {
            selected = [resp.jobs[0].job_id];
            setJobIds(selected);
            jobSelectService.next(selected);
          }
          // TODO: broadcast that there are no jobs. Explorer updates with noJobsSelected
        });
    }
  }, []); // eslint-disable-line

  function renderJobSelectionBar() {
    return (
      <EuiFlexGroup wrap responsive={false} gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup wrap responsive={false} gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={showFlyout}
              >
                Job Selection
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {jobIds.map(jobId => (
          <EuiFlexItem grow={false} key={jobId}>
            <EuiBadge color={'hollow'}>
              {jobId}
            </EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  }

  function renderLoadingIndicator() {
    return (<p>Loading...</p>);
  }

  function renderFlyout() {
    if (isFlyoutVisible) {
      return (
        <EuiFlyout
          onClose={closeFlyout}
          aria-labelledby="flyoutTitle"
          size="l"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id="flyoutTitle">
                Job Selection
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiText>
              <JobSelectorContent
                singleSelection={singleSelection}
                timeseriesOnly={timeseriesOnly}
              />
            </EuiText>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={closeFlyout}
                  fill
                >
                  Apply
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="cross"
                  onClick={closeFlyout}
                >
                  Close
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      );
    }
  }

  return (
    <div className="mlJobSelectorBar">
      {jobIds.length > 0 && renderJobSelectionBar()}
      {jobIds.length === 0 && renderLoadingIndicator()}
      {renderFlyout()}
    </div>
  );
}

JobSelector.propTypes = {
  testText: PropTypes.string
};
