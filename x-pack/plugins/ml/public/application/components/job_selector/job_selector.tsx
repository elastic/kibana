/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';

import {
  EuiButtonEmpty,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFlyout,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import './_index.scss';

import { Dictionary } from '../../../../common/types/common';
import { useUrlState } from '../../util/url_state';
// @ts-ignore
import { IdBadges } from './id_badges';
import {
  BADGE_LIMIT,
  JobSelectorFlyoutContent,
  JobSelectorFlyoutProps,
} from './job_selector_flyout';
import { MlJobWithTimeRange } from '../../../../common/types/anomaly_detection_jobs';
import { useStorage } from '../../contexts/ml/use_storage';
import { ApplyTimeRangeConfig, ML_APPLY_TIME_RANGE_CONFIG } from '../../../../common/types/storage';

interface GroupObj {
  groupId: string;
  jobIds: string[];
}

function mergeSelection(
  jobIds: string[],
  groupObjs: GroupObj[],
  singleSelection: boolean
): string[] {
  if (singleSelection) {
    return jobIds;
  }

  const selectedIds: string[] = [];
  const alreadySelected: string[] = [];

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

type GroupsMap = Dictionary<string[]>;
export function getInitialGroupsMap(selectedGroups: GroupObj[]): GroupsMap {
  const map: GroupsMap = {};

  if (selectedGroups.length) {
    selectedGroups.forEach((group) => {
      map[group.groupId] = group.jobIds;
    });
  }

  return map;
}

export interface JobSelectorProps {
  dateFormatTz: string;
  singleSelection: boolean;
  timeseriesOnly: boolean;
}

export interface JobSelectionMaps {
  jobsMap: Dictionary<MlJobWithTimeRange>;
  groupsMap: Dictionary<string[]>;
}

export function JobSelector({ dateFormatTz, singleSelection, timeseriesOnly }: JobSelectorProps) {
  const [globalState, setGlobalState] = useUrlState('_g');
  const [applyTimeRangeConfig, setApplyTimeRangeConfig] = useStorage<ApplyTimeRangeConfig>(
    ML_APPLY_TIME_RANGE_CONFIG,
    true
  );

  const selectedJobIds = globalState?.ml?.jobIds ?? [];
  const selectedGroups = globalState?.ml?.groups ?? [];

  const [maps, setMaps] = useState<JobSelectionMaps>({
    groupsMap: getInitialGroupsMap(selectedGroups),
    jobsMap: {},
  });
  const [selectedIds, setSelectedIds] = useState(
    mergeSelection(selectedJobIds, selectedGroups, singleSelection)
  );
  const [showAllBarBadges, setShowAllBarBadges] = useState(false);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  // Ensure JobSelectionBar gets updated when selection via globalState changes.
  useEffect(() => {
    setSelectedIds(mergeSelection(selectedJobIds, selectedGroups, singleSelection));
  }, [JSON.stringify([selectedJobIds, selectedGroups])]);

  function closeFlyout() {
    setIsFlyoutVisible(false);
  }

  function showFlyout() {
    setIsFlyoutVisible(true);
  }

  function handleJobSelectionClick() {
    showFlyout();
  }

  const applySelection: JobSelectorFlyoutProps['onSelectionConfirmed'] = useCallback(
    ({ newSelection, jobIds, groups: newGroups, time }) => {
      setSelectedIds(newSelection);

      setGlobalState({
        ml: {
          jobIds,
          groups: newGroups,
        },
        ...(time !== undefined ? { time } : {}),
      });

      closeFlyout();
    },
    [setGlobalState, setSelectedIds]
  );

  function renderJobSelectionBar() {
    return (
      <>
        <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            {selectedIds.length > 0 ? (
              <EuiFlexGroup
                wrap
                responsive={false}
                gutterSize="xs"
                alignItems="center"
                data-test-subj="mlJobSelectionBadges"
              >
                <IdBadges
                  limit={BADGE_LIMIT}
                  maps={maps}
                  onLinkClick={() => setShowAllBarBadges(!showAllBarBadges)}
                  selectedIds={selectedIds}
                  showAllBarBadges={showAllBarBadges}
                />
              </EuiFlexGroup>
            ) : (
              <span>
                <FormattedMessage
                  id="xpack.ml.jobSelector.noJobsSelectedLabel"
                  defaultMessage="No jobs selected"
                />
              </span>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType="pencil"
              onClick={handleJobSelectionClick}
              data-test-subj="mlButtonEditJobSelection"
            >
              {i18n.translate('xpack.ml.jobSelector.jobSelectionButton', {
                defaultMessage: 'Edit job selection',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="s" />
      </>
    );
  }

  function renderFlyout() {
    if (isFlyoutVisible) {
      return (
        <EuiFlyout
          onClose={closeFlyout}
          data-test-subj="mlFlyoutJobSelector"
          aria-labelledby="jobSelectorFlyout"
        >
          <JobSelectorFlyoutContent
            dateFormatTz={dateFormatTz}
            timeseriesOnly={timeseriesOnly}
            singleSelection={singleSelection}
            selectedIds={selectedIds}
            onSelectionConfirmed={applySelection}
            onJobsFetched={setMaps}
            onFlyoutClose={closeFlyout}
            maps={maps}
            applyTimeRangeConfig={applyTimeRangeConfig}
            onTimeRangeConfigChange={setApplyTimeRangeConfig}
          />
        </EuiFlyout>
      );
    }
  }

  return (
    <div>
      {renderJobSelectionBar()}
      {renderFlyout()}
    </div>
  );
}
