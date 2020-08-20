/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';

import { DataFrameAnalyticsListAction, DataFrameAnalyticsListRow } from '../analytics_list/common';

import {
  cloneActionNameText,
  useNavigateToWizardWithClonedJob,
  CloneActionName,
} from './clone_action_name';

export type CloneAction = ReturnType<typeof useCloneAction>;
export const useCloneAction = (canCreateDataFrameAnalytics: boolean) => {
  const navigateToWizardWithClonedJob = useNavigateToWizardWithClonedJob();

  const clickHandler = useCallback((item: DataFrameAnalyticsListRow) => {
    navigateToWizardWithClonedJob(item);
  }, []);

  const action: DataFrameAnalyticsListAction = useMemo(
    () => ({
      name: (item: DataFrameAnalyticsListRow) => (
        <CloneActionName isDisabled={!canCreateDataFrameAnalytics} />
      ),
      enabled: () => canCreateDataFrameAnalytics,
      description: cloneActionNameText,
      icon: 'copy',
      type: 'icon',
      onClick: clickHandler,
      'data-test-subj': 'mlAnalyticsJobCloneButton',
    }),
    []
  );

  return { action };
};
