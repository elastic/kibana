/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Dispatch, SetStateAction, useEffect, useState, useCallback } from 'react';

import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore no-exported-member
  EuiSearchBar,
} from '@elastic/eui';
import { EuiSearchBarQuery } from '../../../../../timelines/components/open_timeline/types';
import * as i18n from './translations';
import { JobsFilters, SiemJob } from '../../types';
import { GroupsFilterPopover } from './groups_filter_popover';

interface JobsTableFiltersProps {
  siemJobs: SiemJob[];
  onFilterChanged: Dispatch<SetStateAction<JobsFilters>>;
}

/**
 * Collection of filters for filtering data within the JobsTable. Contains search bar, Elastic/Custom
 * Jobs filter button toggle, and groups selection
 *
 * @param siemJobs jobs to fetch groups from to display for filtering
 * @param onFilterChanged change listener to be notified on filter changes
 */
export const JobsTableFiltersComponent = ({ siemJobs, onFilterChanged }: JobsTableFiltersProps) => {
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [showCustomJobs, setShowCustomJobs] = useState<boolean>(false);
  const [showElasticJobs, setShowElasticJobs] = useState<boolean>(false);

  // Propagate filter changes to parent
  useEffect(() => {
    onFilterChanged({ filterQuery, showCustomJobs, showElasticJobs, selectedGroups });
  }, [filterQuery, selectedGroups, showCustomJobs, showElasticJobs, onFilterChanged]);

  const handleChange = useCallback(
    (query: EuiSearchBarQuery) => setFilterQuery(query.queryText.trim()),
    [setFilterQuery]
  );

  const handleElasticJobsClick = useCallback(() => {
    setShowElasticJobs(!showElasticJobs);
    setShowCustomJobs(false);
  }, [setShowElasticJobs, showElasticJobs, setShowCustomJobs]);

  const handleCustomJobsClick = useCallback(() => {
    setShowCustomJobs(!showCustomJobs);
    setShowElasticJobs(false);
  }, [setShowElasticJobs, showCustomJobs, setShowCustomJobs]);

  return (
    <EuiFlexGroup gutterSize="m" justifyContent="flexEnd">
      <EuiFlexItem grow={true}>
        <EuiSearchBar
          data-test-subj="jobs-filter-bar"
          box={{
            placeholder: i18n.FILTER_PLACEHOLDER,
            incremental: true,
          }}
          onChange={handleChange}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <GroupsFilterPopover siemJobs={siemJobs} onSelectedGroupsChanged={setSelectedGroups} />
        </EuiFilterGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <EuiFilterButton
            hasActiveFilters={showElasticJobs}
            onClick={handleElasticJobsClick}
            data-test-subj="show-elastic-jobs-filter-button"
            withNext
          >
            {i18n.SHOW_ELASTIC_JOBS}
          </EuiFilterButton>
          <EuiFilterButton
            hasActiveFilters={showCustomJobs}
            onClick={handleCustomJobsClick}
            data-test-subj="show-custom-jobs-filter-button"
          >
            {i18n.SHOW_CUSTOM_JOBS}
          </EuiFilterButton>
        </EuiFilterGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

JobsTableFiltersComponent.displayName = 'JobsTableFiltersComponent';

export const JobsTableFilters = React.memo(JobsTableFiltersComponent);

JobsTableFilters.displayName = 'JobsTableFilters';
