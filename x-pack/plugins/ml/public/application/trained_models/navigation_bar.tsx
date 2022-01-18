/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTab, EuiTabs } from '@elastic/eui';
import { useNavigateToPath } from '../contexts/kibana';
import { checkPermission } from '../capabilities/check_capabilities';

interface Tab {
  id: string;
  name: string;
  path: string;
}

export const TrainedModelsNavigationBar: FC<{
  selectedTabId?: string;
}> = ({ selectedTabId }) => {
  const navigateToPath = useNavigateToPath();

  const canViewMlNodes = checkPermission('canViewMlNodes');

  const tabs = useMemo(() => {
    const navTabs = [
      {
        id: 'trained_models',
        name: i18n.translate('xpack.ml.trainedModels.modelsTabLabel', {
          defaultMessage: 'Trained Models',
        }),
        path: '/trained_models',
        testSubj: 'mlTrainedModelsTab',
      },
      ...(canViewMlNodes
        ? [
            {
              id: 'nodes',
              name: i18n.translate('xpack.ml.trainedModels.nodesTabLabel', {
                defaultMessage: 'Nodes Overview',
              }),
              path: '/trained_models/nodes',
              testSubj: 'mlNodesOverviewTab',
            },
          ]
        : []),
    ];
    return navTabs;
  }, [canViewMlNodes]);

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
