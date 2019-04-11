/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React, { useState, useEffect } from 'react';
import { PropTypes } from 'prop-types';

import { mlJobService } from '../../services/job_service';
import { ml } from '../../services/ml_api_service';
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
  EuiLoadingSpinner,
  EuiTitle
} from '@elastic/eui';


export function JobSelector({
  jobSelectService,
  selectedJobIds,
  singleSelection,
  timeseriesOnly
}) {
  const [selectedIds, setSelectedIds] = useState(selectedJobIds);
  const [newSelection, setNewSelection] = useState(selectedJobIds);
  const [jobs, setJobs] = useState([]);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  function closeFlyout() {
    setIsFlyoutVisible(false);
  }

  function showFlyout() {
    setIsFlyoutVisible(true);
  }

  function handleJobSelectionClick() {
    showFlyout();

    ml.jobs.jobsWithTimerange()
      .then((resp) => {
        setJobs(resp);
      })
      .catch((err) => {
        // TODO: show error toast
        console.log('ERROR', err);
      });
  }

  function onNewSelection(selection) {
    // add selection to jobIds - should we sort these?
    setNewSelection(selection);
  }


  function applySelection() {
    // add selection to jobIds - should we sort these?
    closeFlyout();
    setSelectedIds(newSelection);
    jobSelectService.next(newSelection);
  }

  useEffect(() => {
    if (selectedIds.length === 0) {
      let selected = [];
      mlJobService.loadJobs()
        .then((resp) => {
          if (resp.jobs.length) {
            selected = [resp.jobs[0].job_id];
            setSelectedIds(selected);
            jobSelectService.next(selected);
          }
          // TODO: broadcast that there are no jobs. Explorer updates with noJobsSelected
        });
    }
  }, []); // eslint-disable-line

  function renderIdBadges() {
    return selectedIds.map(id => (
      <EuiFlexItem grow={false} key={id}>
        <EuiBadge color={'hollow'}>
          {id}
        </EuiBadge>
      </EuiFlexItem>
    ));
  }

  function renderJobSelectionBar() {
    return (
      <EuiFlexGroup wrap responsive={false} gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup wrap responsive={false} gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={handleJobSelectionClick}
              >
                Job Selection
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {renderIdBadges()}
      </EuiFlexGroup>
    );
  }

  function renderFlyout() {
    if (isFlyoutVisible) {
      return (
        <EuiFlyout
          onClose={closeFlyout}
          aria-labelledby="Job Selection"
          size="l"
        >
          <EuiFlyoutHeader
            hasBorder
            className="mlJobSelectorFlyoutHeader"
          >
            <EuiTitle size="m">
              <h2 id="flyoutTitle">
                Job Selection
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <JobSelectorContent
              jobs={jobs}
              onSelection={onNewSelection}
              selectedIds={newSelection}
              singleSelection={singleSelection}
              timeseriesOnly={timeseriesOnly}
            />
          </EuiFlyoutBody>
          <EuiFlyoutFooter className="mlJobSelectorFlyoutFooter">
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={applySelection}
                  fill
                  isDisabled={newSelection.length === 0}
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
      {selectedIds.length === 0 && <EuiLoadingSpinner size="s" />}
      {selectedIds.length > 0 && renderJobSelectionBar()}
      {renderFlyout()}
    </div>
  );
}

JobSelector.propTypes = {
  testText: PropTypes.string
};
