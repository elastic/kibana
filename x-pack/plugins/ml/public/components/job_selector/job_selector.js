/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React, { useState, useEffect } from 'react';
import { PropTypes } from 'prop-types';

import { mlJobService } from '../../services/job_service';

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiFlexGroup,
  // EuiFlyout,
  // EuiFlyoutBody,
  // EuiFlyoutHeader,
  // EuiButton,
  // EuiText,
  // EuiTitle
} from '@elastic/eui';


export function JobSelector({
  jobSelectService,
  selectedJobIds,
  singleSelection,
  timeseriesOnly
}) {
  console.log(timeseriesOnly, singleSelection);

  const [jobIds, setJobIds] = useState(selectedJobIds); // eslint-disable-line
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false); // eslint-disable-line

  function closeFlyout() { // eslint-disable-line
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
          // TODO: broadcast that there are no jobs - explorer updates with noJobsSelected
        });
    }
  }, []); // eslint-disable-line

  function renderSelectedIds() {
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

  return (
    <div className="mlJobSelectorBar">
      {jobIds.length > 0 && renderSelectedIds()}
      {jobIds.length === 0 && renderLoadingIndicator()}
    </div>
  );
}

JobSelector.propTypes = {
  testText: PropTypes.string
};
