/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React, { useState } from 'react';
import { PropTypes } from 'prop-types';

// import { mlJobService } from '../../services/job_service';

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

// TODO: should have access to selected job Ids to display badges when navigating from management or on refresh from url
// TODO: get jobs in for display in table - load jobs when CTA is clicked and flyout is opened
// TODO: initial state is loading for when flyout opens
// TODO: get groups in for display in table (only for Anomaly explorer so if singleSelection === false)
//  match groups to group colors
// TODO: display selected jobs or groups in badges at top of flyout
export function JobSelector({ selectedJobIds, singleSelection, timeseriesOnly }) {
  console.log(timeseriesOnly, singleSelection);

  const [jobIds, setJobIds] = useState(selectedJobIds); // eslint-disable-line
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false); // eslint-disable-line

  function closeFlyout() { // eslint-disable-line
    setIsFlyoutVisible(false);
  }

  function showFlyout() {
    setIsFlyoutVisible(true);
  }

  return (
    <div className="mlJobSelectorBar">
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
    </div>
  );
}

JobSelector.propTypes = {
  testText: PropTypes.string
};
