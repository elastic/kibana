/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React, { useState, useEffect, useRef } from 'react';
import { PropTypes } from 'prop-types';
import moment from 'moment';

import { ml } from '../../services/ml_api_service';
import { JobSelectorTable } from './job_selector_table/';
import { timefilter } from 'ui/timefilter';
import { tabColor } from '../../../common/util/group_color_utils';
import { getGroupsFromJobs, normalizeTimes, setGlobalState } from './job_select_service_utils';
import { toastNotifications } from 'ui/notify';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiSwitch,
  EuiText,
  EuiTitle
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';


export function getBadge({ id, icon, isGroup = false, removeId, numJobs }) {
  const color = isGroup ? tabColor(id) : 'hollow';
  let props = { color };
  let jobCount;

  if (icon === true) {
    props = {
      ...props,
      iconType: 'cross',
      iconSide: 'right',
      onClick: () => removeId(id),
      onClickAriaLabel: 'Remove id'
    };
  }

  if (numJobs !== undefined) {
    jobCount = i18n.translate('xpack.ml.jobSelector.selectedGroupJobs', {
      defaultMessage: `({jobsCount, plural, one {# job} other {# jobs}})`,
      values: { jobsCount: numJobs },
    });
  }

  return (
    <EuiBadge key={`${id}-id`} {...props} >
      {`${id}${jobCount ? jobCount : ''}`}
    </EuiBadge>
  );
}

function mergeSelection(jobIds, groupObjs, singleSelection) {
  if (singleSelection) {
    return jobIds;
  }

  const selectedIds = [];
  const alreadySelected = [];

  groupObjs.forEach((group) => {
    selectedIds.push(group.groupId);
    alreadySelected.push(...group.jobIds);
  });

  jobIds.forEach((jobId) => {
    // Add jobId if not already included in group selection
    if (alreadySelected.includes(jobId) === false) {
      selectedIds.push(jobId);
    }
  });

  return selectedIds;
}

function getInitialGroupsMap(selectedGroups) {
  const map = {};

  if (selectedGroups.length) {
    selectedGroups.forEach((group) => {
      map[group.groupId] = group.jobIds;
    });
  }

  return map;
}

const BADGE_LIMIT = 10;
const DEFAULT_GANTT_BAR_WIDTH = 299; // pixels

export function JobSelector({
  config,
  globalState,
  jobSelectService,
  selectedJobIds,
  selectedGroups,
  singleSelection,
  timeseriesOnly
}) {
  const [jobs, setJobs] = useState([]);
  const [groups, setGroups] = useState([]);
  const [maps, setMaps] = useState({ groupsMap: getInitialGroupsMap(selectedGroups), jobsMap: {} });
  const [selectedIds, setSelectedIds] = useState(mergeSelection(selectedJobIds, selectedGroups, singleSelection));
  const [newSelection, setNewSelection] = useState(mergeSelection(selectedJobIds, selectedGroups, singleSelection));
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [showAllBarBadges, setShowAllBarBadges] = useState(false);
  const [applyTimeRange, setApplyTimeRange] = useState(true);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [ganttBarWidth, setGanttBarWidth] = useState(DEFAULT_GANTT_BAR_WIDTH);
  const flyoutEl = useRef(null);

  useEffect(() => {
    // listen for update from Single Metric Viewer
    const subscription = jobSelectService.subscribe(({ selection, resetSelection }) => {
      if (resetSelection === true) {
        setSelectedIds(selection);
      }
    });

    return function cleanup() {
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line

  // Ensure current selected ids always show up in flyout
  useEffect(() => {
    setNewSelection(selectedIds);
  }, [isFlyoutVisible]); // eslint-disable-line

  useEffect(() => {
    const handleResize = () => {
      if (jobs.length > 0 && flyoutEl && flyoutEl.current && flyoutEl.current.flyout) {
        const tzConfig = config.get('dateFormat:tz');
        const dateFormatTz = (tzConfig !== 'Browser') ? tzConfig : moment.tz.guess();
        const derivedWidth = Math.round(flyoutEl.current.flyout.offsetWidth / 4);
        const normalizedJobs = normalizeTimes(jobs, dateFormatTz, derivedWidth);
        setJobs(normalizedJobs);
        const { groups: updatedGroups } = getGroupsFromJobs(normalizedJobs);
        setGroups(updatedGroups);
        setGanttBarWidth(derivedWidth);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [config, jobs]);

  function closeFlyout() {
    setIsFlyoutVisible(false);
  }

  function showFlyout() {
    setIsFlyoutVisible(true);
  }

  function handleJobSelectionClick() {
    showFlyout();
    const tzConfig = config.get('dateFormat:tz');
    const dateFormatTz = (tzConfig !== 'Browser') ? tzConfig : moment.tz.guess();

    ml.jobs.jobsWithTimerange(dateFormatTz)
      .then((resp) => {
        const normalizedJobs = normalizeTimes(resp.jobs, dateFormatTz, DEFAULT_GANTT_BAR_WIDTH);
        const { groups: groupsWithTimerange, groupsMap } = getGroupsFromJobs(normalizedJobs);
        setJobs(normalizedJobs);
        setGroups(groupsWithTimerange);
        setMaps({ groupsMap, jobsMap: resp.jobsMap });
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

  function handleNewSelection({ selectionFromTable }) {
    setNewSelection(selectionFromTable);
  }

  function applySelection() {
    closeFlyout();
    const allNewSelection = [];
    const groupSelection = [];

    newSelection.forEach((id) => {
      if (maps.groupsMap[id] !== undefined) {
        allNewSelection.push(...maps.groupsMap[id]);
        // if it's a group - push group obj to set in global state
        groupSelection.push({ groupId: id, jobIds: maps.groupsMap[id] });
      } else {
        allNewSelection.push(id);
      }
    });
    // create a Set to remove duplicate values
    const allNewSelectionUnique = Array.from(new Set(allNewSelection));

    setSelectedIds(newSelection);
    setNewSelection([]);
    applyTimeRangeFromSelection(allNewSelectionUnique);
    jobSelectService.next({ selection: allNewSelectionUnique });

    setGlobalState(globalState, { selectedIds: allNewSelectionUnique, selectedGroups: groupSelection });
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

  function toggleTimerangeSwitch() {
    setApplyTimeRange(!applyTimeRange);
  }

  function removeId(id) {
    setNewSelection(newSelection.filter((item) => item !== id));
  }

  function clearSelection() {
    setNewSelection([]);
  }

  function renderIdBadges() {
    const badges = [];
    const currentGroups = [];
    // Create group badges. Skip job ids here.
    for (let i = 0; i < selectedIds.length; i++) {
      const currentId = selectedIds[i];
      if (maps.groupsMap[currentId] !== undefined) {
        currentGroups.push(currentId);

        badges.push((
          <EuiFlexItem grow={false} key={currentId}>
            {getBadge({ id: currentId, isGroup: true, numJobs: maps.groupsMap[currentId].length })}
          </EuiFlexItem>
        ));
      } else {
        continue;
      }
    }
    // Create jobId badges for jobs with no groups or with groups not selected
    for (let i = 0; i < selectedIds.length; i++) {
      const currentId = selectedIds[i];
      if (maps.groupsMap[currentId] === undefined) {
        const jobGroups = maps.jobsMap[currentId] || [];

        if (jobGroups.some(g => currentGroups.includes(g)) === false) {
          badges.push((
            <EuiFlexItem grow={false} key={currentId}>
              {getBadge({ id: currentId })}
            </EuiFlexItem>
          ));
        } else {
          continue;
        }
      } else {
        continue;
      }
    }

    if (showAllBarBadges || badges.length <= BADGE_LIMIT) {
      if (badges.length > BADGE_LIMIT) {
        badges.push(
          <EuiLink
            key="more-badges-bar-link"
            onClick={() => setShowAllBarBadges(!showAllBarBadges)}
          >
            <EuiText grow={false} size="xs">
              {i18n.translate('xpack.ml.jobSelector.hideBarBadges', {
                defaultMessage: 'Hide'
              })}
            </EuiText>
          </EuiLink>);
      }

      return badges;
    } else {
      const overFlow = (badges.length - BADGE_LIMIT);

      badges.splice(BADGE_LIMIT);
      badges.push(
        <EuiLink
          key="more-badges-bar-link"
          onClick={() => setShowAllBarBadges(!showAllBarBadges)}
        >
          <EuiText grow={false} size="xs">
            {i18n.translate('xpack.ml.jobSelector.showBarBadges', {
              defaultMessage: `And {overFlow} more`,
              values: { overFlow },
            })}
          </EuiText>
        </EuiLink>);

      return badges;
    }
  }

  function renderNewSelectionIdBadges() {
    const badges = [];

    for (let i = 0; i < newSelection.length; i++) {
      if (i >= BADGE_LIMIT && showAllBadges === false) {
        break;
      }

      badges.push(
        <EuiFlexItem grow={false} key={newSelection[i]}>
          {getBadge({
            id: newSelection[i],
            icon: true,
            removeId,
            isGroup: (maps.groupsMap[newSelection[i]] !== undefined)
          })}
        </EuiFlexItem>
      );
    }

    if (showAllBadges === false && newSelection.length > BADGE_LIMIT) {
      badges.push(
        <EuiLink
          key="more-badges-link"
          onClick={() => setShowAllBadges(!showAllBadges)}
        >
          <EuiText grow={false} size="xs">
            {i18n.translate('xpack.ml.jobSelector.showFlyoutBadges', {
              defaultMessage: `And {overFlow} more`,
              values: { overFlow: newSelection.length - BADGE_LIMIT },
            })}
          </EuiText>
        </EuiLink>);
    } else if (showAllBadges === true && newSelection.length > BADGE_LIMIT) {
      badges.push(
        <EuiLink
          key="hide-badges-link"
          onClick={() => setShowAllBadges(!showAllBadges)}
        >
          <EuiText grow={false} size="xs">
            {i18n.translate('xpack.ml.jobSelector.hideFlyoutBadges', {
              defaultMessage: 'Hide'
            })}
          </EuiText>
        </EuiLink>);
    }

    return badges;
  }

  function renderJobSelectionBar() {
    return (
      <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={handleJobSelectionClick}
          >
            {i18n.translate('xpack.ml.jobSelector.jobSelectionButton', {
              defaultMessage: 'Job Selection'
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup wrap responsive={false} gutterSize="xs" alignItems="center">
            {renderIdBadges()}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  function renderFlyout() {
    if (isFlyoutVisible) {
      return (
        <EuiFlyout
          ref={flyoutEl}
          onClose={closeFlyout}
          aria-labelledby="Job Selection"
          size="l"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id="flyoutTitle">
                {i18n.translate('xpack.ml.jobSelector.flyoutTitle', {
                  defaultMessage: 'Job Selection'
                })}
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
                <EuiFlexGroup direction="row" justifyContent="spaceBetween" responsive={false}>
                  <EuiFlexItem grow={false}>
                    {!singleSelection && newSelection.length > 0 &&
                    <EuiButtonEmpty
                      onClick={clearSelection}
                      size="xs"
                    >
                      {i18n.translate('xpack.ml.jobSelector.clearAllFlyoutButton', {
                        defaultMessage: 'Clear All'
                      })}
                    </EuiButtonEmpty>}
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiSwitch
                      label={i18n.translate('xpack.ml.jobSelector.applyTimerangeSwitchLabel', {
                        defaultMessage: 'Apply timerange'
                      })}
                      checked={applyTimeRange}
                      onChange={toggleTimerangeSwitch}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            <JobSelectorTable
              jobs={jobs}
              ganttBarWidth={ganttBarWidth}
              groupsList={groups}
              onSelection={handleNewSelection}
              selectedIds={newSelection}
              singleSelection={singleSelection}
              timeseriesOnly={timeseriesOnly}
            />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={applySelection}
                  fill
                  isDisabled={newSelection.length === 0}
                >
                  {i18n.translate('xpack.ml.jobSelector.applyFlyoutButton', {
                    defaultMessage: 'Apply'
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="cross"
                  onClick={closeFlyout}
                >
                  {i18n.translate('xpack.ml.jobSelector.closeFlyoutButton', {
                    defaultMessage: 'Close'
                  })}
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
      {selectedIds.length > 0 && renderJobSelectionBar()}
      {renderFlyout()}
    </div>
  );
}

JobSelector.propTypes = {
  globalState: PropTypes.object,
  jobSelectService: PropTypes.object,
  selectedJobIds: PropTypes.array,
  singleSelection: PropTypes.string,
  timeseriesOnly: PropTypes.string
};
