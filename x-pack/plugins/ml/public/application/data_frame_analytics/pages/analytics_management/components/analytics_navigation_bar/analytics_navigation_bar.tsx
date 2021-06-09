/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTab, EuiTabs } from '@elastic/eui';
import { useNavigateToPath } from '../../../../../contexts/kibana';

interface Tab {
  id: string;
  name: string;
  path: string;
}

export const AnalyticsNavigationBar: FC<{
  selectedTabId?: string;
  jobId?: string;
  modelId?: string;
}> = ({ jobId, modelId, selectedTabId }) => {
  const navigateToPath = useNavigateToPath();

  const tabs = useMemo(() => {
    const navTabs = [
      {
        id: 'data_frame_analytics',
        name: i18n.translate('xpack.ml.dataframe.jobsTabLabel', {
          defaultMessage: 'Jobs',
        }),
        path: '/data_frame_analytics',
        testSubj: 'mlAnalyticsJobsTab',
      },
      {
        id: 'models',
        name: i18n.translate('xpack.ml.dataframe.modelsTabLabel', {
          defaultMessage: 'Models',
        }),
        path: '/data_frame_analytics/models',
        testSubj: 'mlTrainedModelsTab',
      },
    ];
    if (jobId !== undefined || modelId !== undefined) {
      navTabs.push({
        id: 'map',
        name: i18n.translate('xpack.ml.dataframe.mapTabLabel', {
          defaultMessage: 'Map',
        }),
        path: '/data_frame_analytics/map',
        testSubj: '',
      });
    }
    return navTabs;
  }, [jobId !== undefined]);

  const onTabClick = useCallback(
    async (tab: Tab) => {
      await navigateToPath(tab.path, true);
    },
    [navigateToPath]
  );

  return (
    <EuiTabs>
      {tabs.map((tab) => {
        return (
          <EuiTab
            key={`tab-${tab.id}`}
            isSelected={tab.id === selectedTabId}
            onClick={onTabClick.bind(null, tab)}
            data-test-subj={tab.testSubj}
          >
            {tab.name}
          </EuiTab>
        );
      })}
    </EuiTabs>
  );
};
