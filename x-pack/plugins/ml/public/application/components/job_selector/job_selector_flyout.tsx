/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import { NewSelectionIdBadges } from './new_selection_id_badges';
// @ts-ignore
import { JobSelectorTable } from './job_selector_table';
import {
  getGroupsFromJobs,
  getTimeRangeFromSelection,
  normalizeTimes,
} from './job_select_service_utils';
import { MlJobWithTimeRange } from '../../../../common/types/anomaly_detection_jobs';
import { useMlKibana } from '../../contexts/kibana';
import { JobSelectionMaps } from './job_selector';

export const BADGE_LIMIT = 10;
export const DEFAULT_GANTT_BAR_WIDTH = 299; // pixels

export interface JobSelectorFlyoutProps {
  dateFormatTz: string;
  selectedIds?: string[];
  newSelection?: string[];
  onFlyoutClose: () => void;
  onJobsFetched?: (maps: JobSelectionMaps) => void;
  onSelectionChange?: (newSelection: string[]) => void;
  onSelectionConfirmed: (payload: {
    newSelection: string[];
    jobIds: string[];
    groups: Array<{ groupId: string; jobIds: string[] }>;
    time: any;
  }) => void;
  singleSelection: boolean;
  timeseriesOnly: boolean;
  maps: JobSelectionMaps;
  withTimeRangeSelector?: boolean;
}

export const JobSelectorFlyout: FC<JobSelectorFlyoutProps> = ({
  dateFormatTz,
  selectedIds = [],
  singleSelection,
  timeseriesOnly,
  onJobsFetched,
  onSelectionChange,
  onSelectionConfirmed,
  onFlyoutClose,
  maps,
  withTimeRangeSelector = true,
}) => {
  const {
    services: {
      notifications,
      mlServices: { mlApiServices },
    },
  } = useMlKibana();

  const [newSelection, setNewSelection] = useState(selectedIds);

  const [showAllBadges, setShowAllBadges] = useState(false);
  const [applyTimeRange, setApplyTimeRange] = useState(true);
  const [jobs, setJobs] = useState<MlJobWithTimeRange[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [ganttBarWidth, setGanttBarWidth] = useState(DEFAULT_GANTT_BAR_WIDTH);
  const [jobGroupsMaps, setJobGroupsMaps] = useState(maps);

  const flyoutEl = useRef<{ flyout: HTMLElement }>(null);

  function applySelection() {
    // allNewSelection will be a list of all job ids (including those from groups) selected from the table
    const allNewSelection: string[] = [];
    const groupSelection: Array<{ groupId: string; jobIds: string[] }> = [];

    newSelection.forEach((id) => {
      if (jobGroupsMaps.groupsMap[id] !== undefined) {
        // Push all jobs from selected groups into the newSelection list
        allNewSelection.push(...jobGroupsMaps.groupsMap[id]);
        // if it's a group - push group obj to set in global state
        groupSelection.push({ groupId: id, jobIds: jobGroupsMaps.groupsMap[id] });
      } else {
        allNewSelection.push(id);
      }
    });
    // create a Set to remove duplicate values
    const allNewSelectionUnique = Array.from(new Set(allNewSelection));

    const time = applyTimeRange
      ? getTimeRangeFromSelection(jobs, allNewSelectionUnique)
      : undefined;

    onSelectionConfirmed({
      newSelection: allNewSelectionUnique,
      jobIds: allNewSelectionUnique,
      groups: groupSelection,
      time,
    });
  }

  function removeId(id: string) {
    setNewSelection(newSelection.filter((item) => item !== id));
  }

  function toggleTimerangeSwitch() {
    setApplyTimeRange(!applyTimeRange);
  }

  function clearSelection() {
    setNewSelection([]);
  }

  function handleNewSelection({ selectionFromTable }: { selectionFromTable: any }) {
    setNewSelection(selectionFromTable);
  }

  // Wrap handleResize in useCallback as it is a dependency for useEffect on line 131 below.
  // Not wrapping it would cause this dependency to change on every render
  const handleResize = useCallback(() => {
    if (jobs.length > 0 && flyoutEl && flyoutEl.current && flyoutEl.current.flyout) {
      // get all cols in flyout table
      const tableHeaderCols: NodeListOf<HTMLElement> = flyoutEl.current.flyout.querySelectorAll(
        'table thead th'
      );
      // get the width of the last col
      const derivedWidth = tableHeaderCols[tableHeaderCols.length - 1].offsetWidth - 16;
      const normalizedJobs = normalizeTimes(jobs, dateFormatTz, derivedWidth);
      setJobs(normalizedJobs);
      const { groups: updatedGroups } = getGroupsFromJobs(normalizedJobs);
      setGroups(updatedGroups);
      setGanttBarWidth(derivedWidth);
    }
  }, [dateFormatTz, jobs]);

  // Fetch jobs list on flyout open
  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    try {
      const resp = await mlApiServices.jobs.jobsWithTimerange(dateFormatTz);
      const normalizedJobs = normalizeTimes(resp.jobs, dateFormatTz, DEFAULT_GANTT_BAR_WIDTH);
      const { groups: groupsWithTimerange, groupsMap } = getGroupsFromJobs(normalizedJobs);
      setJobs(normalizedJobs);
      setGroups(groupsWithTimerange);
      setJobGroupsMaps({ groupsMap, jobsMap: resp.jobsMap });

      if (onJobsFetched) {
        onJobsFetched({ groupsMap, jobsMap: resp.jobsMap });
      }
    } catch (e) {
      console.error('Error fetching jobs with time range', e); // eslint-disable-line
      const { toasts } = notifications;
      toasts.addDanger({
        title: i18n.translate('xpack.ml.jobSelector.jobFetchErrorMessage', {
          defaultMessage: 'An error occurred fetching jobs. Refresh and try again.',
        }),
      });
    }
  }

  useEffect(() => {
    // Ensure ganttBar width gets calculated on resize
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  useEffect(() => {
    handleResize();
  }, [handleResize, jobs]);

  return (
    <EuiFlyout
      // @ts-ignore
      ref={flyoutEl}
      onClose={onFlyoutClose}
      aria-labelledby="jobSelectorFlyout"
      data-test-subj="mlFlyoutJobSelector"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyoutTitle">
            {i18n.translate('xpack.ml.jobSelector.flyoutTitle', {
              defaultMessage: 'Job selection',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody className="mlJobSelectorFlyoutBody">
        <EuiFlexGroup direction="column" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup wrap responsive={false} gutterSize="xs" alignItems="center">
              <NewSelectionIdBadges
                limit={BADGE_LIMIT}
                maps={jobGroupsMaps}
                newSelection={newSelection}
                onDeleteClick={removeId}
                onLinkClick={() => setShowAllBadges(!showAllBadges)}
                showAllBadges={showAllBadges}
              />
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="row" justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                {!singleSelection && newSelection.length > 0 && (
                  <EuiButtonEmpty
                    onClick={clearSelection}
                    size="xs"
                    data-test-subj="mlFlyoutJobSelectorButtonClearSelection"
                  >
                    {i18n.translate('xpack.ml.jobSelector.clearAllFlyoutButton', {
                      defaultMessage: 'Clear all',
                    })}
                  </EuiButtonEmpty>
                )}
              </EuiFlexItem>
              {withTimeRangeSelector && (
                <EuiFlexItem grow={false}>
                  <EuiSwitch
                    label={i18n.translate('xpack.ml.jobSelector.applyTimerangeSwitchLabel', {
                      defaultMessage: 'Apply timerange',
                    })}
                    checked={applyTimeRange}
                    onChange={toggleTimerangeSwitch}
                    data-test-subj="mlFlyoutJobSelectorSwitchApplyTimeRange"
                  />
                </EuiFlexItem>
              )}
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
              data-test-subj="mlFlyoutJobSelectorButtonApply"
            >
              {i18n.translate('xpack.ml.jobSelector.applyFlyoutButton', {
                defaultMessage: 'Apply',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              onClick={onFlyoutClose}
              data-test-subj="mlFlyoutJobSelectorButtonClose"
            >
              {i18n.translate('xpack.ml.jobSelector.closeFlyoutButton', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
