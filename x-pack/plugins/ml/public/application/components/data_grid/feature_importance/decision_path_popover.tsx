/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import { EuiTabs, EuiTab } from '@elastic/eui';
import { FeatureImportanceDecisionPath } from './decision_path_chart';
import { DecisionPathJSONViewer } from './decision_path_json_viewer';
import { FeatureImportance } from '../../../../../common/types/feature_importance';

interface DecisionPathPopoverProps {
  baseline?: number;
  featureImportance: FeatureImportance[];
}

enum DECISION_PATH_TABS {
  CHART = 'decision_path_chart',
  JSON = 'decision_path_json',
}
export const DecisionPathPopover: FC<DecisionPathPopoverProps> = ({
  baseline,
  featureImportance,
}) => {
  const [selectedTabId, setSelectedTabId] = useState(DECISION_PATH_TABS.CHART);

  if (featureImportance.length < 2) {
    return <DecisionPathJSONViewer featureImportance={featureImportance} />;
  }

  const tabs = [
    {
      id: DECISION_PATH_TABS.CHART,
      name: 'Chart',
    },
    {
      id: DECISION_PATH_TABS.JSON,
      name: 'JSON',
    },
  ];

  return (
    <div style={{ width: 300, height: 200 }}>
      <EuiTabs display="condensed">
        {tabs.map((tab) => (
          <EuiTab
            isSelected={tab.id === selectedTabId}
            onClick={() => setSelectedTabId(tab.id)}
            key={tab.id}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
      {selectedTabId === DECISION_PATH_TABS.CHART && (
        <FeatureImportanceDecisionPath baseline={baseline} featureImportance={featureImportance} />
      )}
      {selectedTabId === DECISION_PATH_TABS.JSON && (
        <DecisionPathJSONViewer featureImportance={featureImportance} />
      )}
    </div>
  );
};
