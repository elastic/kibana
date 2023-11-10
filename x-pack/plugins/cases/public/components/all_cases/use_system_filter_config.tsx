/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';

import type { CaseStatuses } from '../../../common/types/domain';
import { MAX_TAGS_FILTER_LENGTH, MAX_CATEGORY_FILTER_LENGTH } from '../../../common/constants';
import { MultiSelectFilter } from './multi_select_filter';
import { SolutionFilter } from './solution_filter';
import { StatusFilter } from './status_filter';
import * as i18n from './translations';
import { SeverityFilter } from './severity_filter';
import { AssigneesFilterPopover } from './assignees_filter';
import type { CurrentUserProfile } from '../types';
import type { AssigneesFilteringSelection } from '../user_profiles/types';
import type { FilterOptions } from '../../containers/types';

interface UseSystemFilterConfigProps {
  availableSolutions: string[];
  caseAssignmentAuthorized: boolean;
  categories: string[];
  countClosedCases: number | null;
  countInProgressCases: number | null;
  countOpenCases: number | null;
  currentUserProfile: CurrentUserProfile;
  handleSelectedAssignees: (newAssignees: AssigneesFilteringSelection[]) => void;
  hiddenStatuses?: CaseStatuses[];
  isLoading: boolean;
  isSelectorView?: boolean;
  selectedAssignees: AssigneesFilteringSelection[];
  tags: string[];
}

export interface SystemFilterConfig {
  key: string;
  label: string;
  isActive: boolean;
  isAvailable: boolean;
  render: ({
    filterOptions,
    onChange,
  }: {
    filterOptions: FilterOptions;
    onChange: ({ filterId, options }: { filterId: string; options: string[] }) => void;
  }) => React.ReactNode;
}

export const getSystemFilterConfig = ({
  availableSolutions,
  caseAssignmentAuthorized,
  categories,
  countClosedCases,
  countInProgressCases,
  countOpenCases,
  currentUserProfile,
  handleSelectedAssignees,
  hiddenStatuses,
  isLoading,
  isSelectorView,
  selectedAssignees,
  tags,
}: UseSystemFilterConfigProps): SystemFilterConfig[] => {
  return [
    {
      key: 'severity',
      label: i18n.SEVERITY,
      isActive: true,
      isAvailable: true,
      render: ({ filterOptions, onChange }) => (
        <SeverityFilter selectedOptions={filterOptions.severity} onChange={onChange} />
      ),
    },
    {
      key: 'status',
      label: i18n.STATUS,
      isActive: true,
      isAvailable: true,
      render: ({ filterOptions, onChange }) => (
        <StatusFilter
          selectedOptions={filterOptions?.status}
          onChange={onChange}
          hiddenStatuses={hiddenStatuses}
          countClosedCases={countClosedCases}
          countInProgressCases={countInProgressCases}
          countOpenCases={countOpenCases}
        />
      ),
    },
    {
      key: 'assignee',
      label: i18n.ASSIGNEES,
      isActive: true,
      isAvailable: caseAssignmentAuthorized && !isSelectorView,
      render: ({ filterOptions, onChange }) => (
        <AssigneesFilterPopover
          selectedAssignees={selectedAssignees}
          currentUserProfile={currentUserProfile}
          isLoading={isLoading}
          onSelectionChange={handleSelectedAssignees}
        />
      ),
    },
    {
      key: 'tags',
      label: i18n.TAGS,
      isActive: true,
      isAvailable: true,
      render: ({ filterOptions, onChange }) => (
        <MultiSelectFilter
          buttonLabel={i18n.TAGS}
          id={'tags'}
          limit={MAX_TAGS_FILTER_LENGTH}
          limitReachedMessage={i18n.MAX_SELECTED_FILTER(MAX_TAGS_FILTER_LENGTH, 'tags')}
          onChange={onChange}
          options={tags}
          selectedOptions={filterOptions?.tags}
        />
      ),
    },
    {
      key: 'category',
      label: i18n.CATEGORIES,
      isActive: true,
      isAvailable: true,
      render: ({ filterOptions, onChange }) => (
        <MultiSelectFilter
          buttonLabel={i18n.CATEGORIES}
          id={'category'}
          limit={MAX_CATEGORY_FILTER_LENGTH}
          limitReachedMessage={i18n.MAX_SELECTED_FILTER(MAX_CATEGORY_FILTER_LENGTH, 'categories')}
          onChange={onChange}
          options={categories}
          selectedOptions={filterOptions?.category}
        />
      ),
    },
    {
      key: 'owner',
      label: i18n.SOLUTION,
      isActive: true,
      isAvailable: availableSolutions.length > 1,
      render: ({ filterOptions, onChange }) => (
        <SolutionFilter
          onChange={onChange}
          selectedOptions={filterOptions?.owner}
          availableSolutions={availableSolutions}
        />
      ),
    },
  ].filter((filter) => filter.isAvailable);
};

export const useSystemFilterConfig = ({
  availableSolutions,
  caseAssignmentAuthorized,
  categories,
  countClosedCases,
  countInProgressCases,
  countOpenCases,
  currentUserProfile,
  handleSelectedAssignees,
  hiddenStatuses,
  isLoading,
  isSelectorView,
  selectedAssignees,
  tags,
}: UseSystemFilterConfigProps) => {
  const [filterConfig, setFilterConfig] = useState<SystemFilterConfig[]>(() =>
    getSystemFilterConfig({
      availableSolutions,
      caseAssignmentAuthorized,
      categories,
      countClosedCases,
      countInProgressCases,
      countOpenCases,
      currentUserProfile,
      handleSelectedAssignees,
      hiddenStatuses,
      isLoading,
      isSelectorView,
      selectedAssignees,
      tags,
    })
  );

  useEffect(() => {
    setFilterConfig(
      getSystemFilterConfig({
        availableSolutions,
        caseAssignmentAuthorized,
        categories,
        countClosedCases,
        countInProgressCases,
        countOpenCases,
        currentUserProfile,
        handleSelectedAssignees,
        hiddenStatuses,
        isLoading,
        isSelectorView,
        selectedAssignees,
        tags,
      })
    );
  }, [
    availableSolutions,
    caseAssignmentAuthorized,
    categories,
    countClosedCases,
    countInProgressCases,
    countOpenCases,
    currentUserProfile,
    handleSelectedAssignees,
    hiddenStatuses,
    isLoading,
    isSelectorView,
    selectedAssignees,
    tags,
  ]);

  return {
    systemFilterConfig: filterConfig,
  };
};
