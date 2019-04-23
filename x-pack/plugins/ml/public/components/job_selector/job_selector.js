/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React, { useState, useEffect } from 'react';
import { PropTypes } from 'prop-types';
import moment from 'moment';
import d3 from 'd3';

import { mlJobService } from '../../services/job_service';
import { ml } from '../../services/ml_api_service';
import { JobSelectorTable } from './job_selector_table';
import { timefilter } from 'ui/timefilter';
import { stringHash } from '../../../common/util/string_utils';
import { setGlobalState } from './job_select_service_utils';
import { toastNotifications } from 'ui/notify';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiButton,
  EuiLoadingSpinner,
  EuiSwitch,
  EuiTitle
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import * as euiVars from '@elastic/eui/dist/eui_theme_dark.json';

const COLORS = [
  euiVars.euiColorVis0,
  euiVars.euiColorVis1,
  euiVars.euiColorVis2,
  euiVars.euiColorVis3,
  // euiVars.euiColorVis4, // light pink, too hard to read with white text
  euiVars.euiColorVis5,
  euiVars.euiColorVis6,
  euiVars.euiColorVis7,
  euiVars.euiColorVis8,
  euiVars.euiColorVis9,
  euiVars.euiColorDarkShade,
  euiVars.euiColorPrimary
];

const colorMap = {};

function tabColor(name) {
  if (colorMap[name] === undefined) {
    const n = stringHash(name);
    const color = COLORS[(n % COLORS.length)];
    colorMap[name] = color;
    return color;
  } else {
    return colorMap[name];
  }
}

export function getBadge({ id, icon, isGroup = false, removeId }) {
  const color = isGroup ? tabColor(id) : 'hollow';
  let props = { color };

  if (icon === true) {
    props = {
      ...props,
      iconType: 'cross',
      iconSide: 'right',
      onClick: () => removeId(id),
      onClickAriaLabel: 'Remove id'
    };
  }

  return (
    <EuiBadge key={`${id}-id`} {...props} >
      {id}
    </EuiBadge>
  );
}

// TODO: move to server side if possible
function normalizeTimes(jobs) {
  const min = Math.min(...jobs.map(job => +job.timeRange.from));
  const max = Math.max(...jobs.map(job => +job.timeRange.to));

  const gantScale = d3.scale.linear().domain([min, max]).range([1, 299]);

  jobs.forEach(job => {
    if (job.timeRange.to !== undefined && job.timeRange.from !== undefined) {
      job.timeRange.fromPx = gantScale(job.timeRange.from);
      job.timeRange.toPx = gantScale(job.timeRange.to);
      job.timeRange.widthPx = job.timeRange.toPx - job.timeRange.fromPx;

      job.timeRange.toMoment = moment(job.timeRange.to);
      job.timeRange.fromMoment = moment(job.timeRange.from);

      const fromString = job.timeRange.fromMoment.format('MMM Do YYYY, HH:mm');
      const toString = job.timeRange.toMoment.format('MMM Do YYYY, HH:mm');
      job.timeRange.label = i18n.translate('xpack.ml.jobSelector.jobTimeRangeLabel', {
        defaultMessage: '{fromString} to {toString}',
        values: {
          fromString,
          toString,
        }
      });
    }
  });
  return jobs;
}

export function JobSelector({
  globalState,
  jobSelectService,
  selectedJobIds,
  singleSelection,
  // timeseriesOnly
}) {
  const [jobs, setJobs] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupsMap, setGroupsMap] = useState([]);
  const [selectedIds, setSelectedIds] = useState(selectedJobIds);
  const [newSelection, setNewSelection] = useState(selectedJobIds);
  const [allJobs, setAllJobs] = useState(false);
  const [allGroups, setAllGroups] = useState(false);
  const [applyTimeRange, setApplyTimeRange] = useState(true);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

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

  // Ensure current selected ids always show up in flyout
  useEffect(() => {
    setNewSelection(selectedIds);
  }, [isFlyoutVisible]); // eslint-disable-line

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
        const jobsWithTimerange = normalizeTimes(resp.jobs);
        const groupsWithTimerange = normalizeTimes(resp.groups);
        setJobs(jobsWithTimerange);
        setGroups(groupsWithTimerange);
        setGroupsMap(resp.groupsMap);
      })
      .catch((err) => {
        console.log('Error fetching jobs', err);
        toastNotifications.addDanger({
          title: i18n.translate('xpack.ml.jobSelector.jobFetchErrorMessage', {
            defaultMessage: 'An error occurred fetching jobs. Refresh and try again.',
          })
        });
      });
  }

  function handleNewSelection({ selectionFromTable, isGroup = false }) {
    console.log('IS GROUP', isGroup); // TODO: isGroup still needed?
    // if it's groups then we add the selected groups Ids
    setNewSelection(selectionFromTable);
  }

  function applySelection() {
    closeFlyout();

    const allNewSelection = [];
    // const groupIds = [];
    // if it is a group - grab all the jobIds for it
    newSelection.forEach((id) => {
      if (groupsMap[id] !== undefined) {
        // groupIds.push(id);
        allNewSelection.push(...groupsMap[id].jobIds);
      } else {
        allNewSelection.push(id);
      }
    });
    // create a Set to remove duplicate values
    const allNewSelectionUnique = Array.from(new Set(allNewSelection));

    setSelectedIds(newSelection);
    setNewSelection([]);
    applyTimeRangeFromSelection(allNewSelectionUnique);
    jobSelectService.next(allNewSelectionUnique);

    // save selection in global state
    setGlobalState(globalState, allNewSelectionUnique);
  }

  function applyTimeRangeFromSelection(selection) {
    if (applyTimeRange && jobs.length > 0) {
      const times = [];
      jobs.forEach(job => {
        if (selection.includes(job.job_id)) {
          if (job.timeRange.from !== undefined) {
            times.push(job.timeRange.from);
          }
          if (job.timeRange.to !== undefined) {
            times.push(job.timeRange.to);
          }
        }
      });
      if (times.length) {
        const min = Math.min(...times);
        const max = Math.max(...times);
        timefilter.setTime({
          from: moment(min).toISOString(),
          to: moment(max).toISOString()
        });
      }
    }
  }

  function handleTimerangeSwitchToggle() {
    setApplyTimeRange(!applyTimeRange);
  }

  function handleAllJobsToggle() {
    const allJobsSelected = !allJobs;
    setAllJobs(allJobsSelected);
    const selected = (allJobsSelected ? jobs.map((job) => job.job_id) : []);
    setNewSelection(selected);
  }

  function handleAllGroupsToggle() {
    setAllGroups(!allGroups);
  }

  function removeId(id) {
    setNewSelection(newSelection.filter((item) => item !== id));
  }

  function clearSelection() {
    setNewSelection([]);
  }
  // check for groups here since this is all selected in job selector bar
  function renderIdBadges() {
    return selectedIds.map(id => (
      <EuiFlexItem grow={false} key={id}>
        {getBadge({ id, isGroup: (groupsMap[id] !== undefined) })}
      </EuiFlexItem>
    ));
  }

  function renderNewSelectionIdBadges() {
    return newSelection.map(id => (
      <EuiFlexItem grow={false} key={id}>
        {getBadge({ id, icon: true, removeId, isGroup: (groupsMap[id] !== undefined) })}
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
          <EuiFlyoutBody className="mlJobSelectorFlyoutBody">
            <EuiFlexGroup direction="column" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup wrap responsive={false} gutterSize="xs" alignItems="center">
                  {renderNewSelectionIdBadges()}
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup direction="row" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiCheckbox
                      id="allGroups"
                      label="Select all groups"
                      checked={allGroups}
                      onChange={handleAllGroupsToggle}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiCheckbox
                      id="allJobs"
                      label="Select all jobs"
                      checked={allJobs}
                      onChange={handleAllJobsToggle}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      onClick={clearSelection}
                      size="xs"
                    >
                      Clear all
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiSwitch
                      label="Apply timerange"
                      checked={applyTimeRange}
                      onChange={handleTimerangeSwitchToggle}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            <JobSelectorTable
              jobs={jobs}
              groupsList={groups}
              onSelection={handleNewSelection}
              selectedIds={newSelection}
              singleSelection={singleSelection}
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
