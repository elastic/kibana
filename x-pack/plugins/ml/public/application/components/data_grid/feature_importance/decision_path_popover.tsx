/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
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

const FEATURE_NAME = 'feature_name';
const FEATURE_IMPORTANCE = 'importance';

export interface ExtendedFeatureImportance extends FeatureImportance {
  absImportance?: number;
}
export const useDecisionPathData = ({ baseline, featureImportance }: DecisionPathPopoverProps) => {
  const [decisionPlotData, setDecisionPlotData] = useState();

  useEffect(() => {
    let mappedFeatureImportance: ExtendedFeatureImportance[] = featureImportance;
    mappedFeatureImportance = mappedFeatureImportance.map((d) => ({
      ...d,
      absImportance: Math.abs(d[FEATURE_IMPORTANCE]),
    }));

    if (baseline) {
      // get the absolute absImportance of the importance value to the baseline for sorting
      mappedFeatureImportance.push({
        [FEATURE_NAME]: 'baseline',
        [FEATURE_IMPORTANCE]: baseline,
        absImportance: 0,
      });
    }

    mappedFeatureImportance = mappedFeatureImportance
      // sort so absolute importance so it goes from bottom (baseline) to top
      .sort((a, b) => b.absImportance - a.absImportance)
      .map((d) => [d[FEATURE_NAME], d[FEATURE_IMPORTANCE]]);

    // start at the baseline and end at predicted value
    // for regression, cumulativeSum should add up to baseline
    let cumulativeSum = 0;
    for (let i = mappedFeatureImportance.length - 1; i >= 0; i--) {
      cumulativeSum += mappedFeatureImportance[i][1];
      mappedFeatureImportance[i][2] = cumulativeSum;
    }

    // go back and readjust the starting point to m.{}_prediction - cumulativeSum
    // to account for when there are more or less features included in the analysis than the max set

    setDecisionPlotData(mappedFeatureImportance);
  }, [baseline, featureImportance]);

  return { decisionPlotData };
};
export const DecisionPathPopover: FC<DecisionPathPopoverProps> = ({
  baseline,
  featureImportance,
}) => {
  const [selectedTabId, setSelectedTabId] = useState(DECISION_PATH_TABS.CHART);
  const { decisionPlotData } = useDecisionPathData({ baseline, featureImportance });

  if (featureImportance.length < 2) {
    return <DecisionPathJSONViewer featureImportance={featureImportance} />;
  }

  const tabs = [
    {
      id: DECISION_PATH_TABS.CHART,
      name: (
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.explorationResults.decisionPathPlot"
          defaultMessage="Decision plot"
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
          <EuiText size={'xs'} color="subdued" style={{ paddingTop: 5 }}>
            <FormattedMessage
              id="xpack.ml.dataframe.analytics.explorationResults.decisionPathPlotHelpText"
              defaultMessage="SHAP decision plots use {linkedFeatureImportanceValues} to show how models arrive at the predicted values."
              values={{
                linkedFeatureImportanceValues: (
                  <EuiLink
                    href="https://www.elastic.co/guide/en/machine-learning/7.8/ml-feature-importance.html"
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.ml.dataframe.analytics.explorationResults.linkedFeatureImportanceValues"
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
            decisionPlotData={decisionPlotData}
          />
        </>
      )}
      {selectedTabId === DECISION_PATH_TABS.JSON && (
        <DecisionPathJSONViewer featureImportance={featureImportance} />
      )}
    </>
  );
};
