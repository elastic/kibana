/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import { EuiTabs, EuiTab, EuiText, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
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
      name: (
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.explorationResults.decisionPathPlot"
          defaultMessage="Decision Plot"
        />
      ),
    },
    {
      id: DECISION_PATH_TABS.JSON,
      name: (
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.explorationResults.decisionPathJSON"
          defaultMessage="JSON"
        />
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', width: 300 }}>
        <EuiTabs size={'s'}>
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
      </div>
      {selectedTabId === DECISION_PATH_TABS.CHART && (
        <>
          <EuiText size={'xs'}>
            <FormattedMessage
              id="xpack.ml.dataframe.analytics.explorationResults.decisionPathPlotHelpText"
              defaultMessage={`SHAP decision plots use {linkedFeatureImportanceValues} to show how models arrive at the predicted values.`}
              values={{
                linkedFeatureImportanceValues: (
                  <EuiLink
                    href="https://www.elastic.co/guide/en/machine-learning/7.8/ml-feature-importance.html"
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.monitoring.cluster.listing.incompatibleLicense.getLicenseLinkLabel"
                      defaultMessage="feature importance values"
                    />
                  </EuiLink>
                ),
              }}
            />
          </EuiText>

          <FeatureImportanceDecisionPath
            baseline={baseline}
            featureImportance={featureImportance}
          />
        </>
      )}
      {selectedTabId === DECISION_PATH_TABS.JSON && (
        <DecisionPathJSONViewer featureImportance={featureImportance} />
      )}
    </>
  );
};
