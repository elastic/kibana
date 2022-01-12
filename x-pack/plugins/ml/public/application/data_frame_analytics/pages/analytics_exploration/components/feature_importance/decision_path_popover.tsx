/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import { EuiLink, EuiTab, EuiTabs, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { RegressionDecisionPath } from './decision_path_regression';
import { DecisionPathJSONViewer } from './decision_path_json_viewer';
import {
  FeatureImportance,
  FeatureImportanceBaseline,
  isClassificationFeatureImportanceBaseline,
  isRegressionFeatureImportanceBaseline,
  TopClasses,
} from '../../../../../../../common/types/feature_importance';
import { ANALYSIS_CONFIG_TYPE } from '../../../../common';
import { ClassificationDecisionPath } from './decision_path_classification';
import { useMlKibana } from '../../../../../contexts/kibana';
import type { DataFrameAnalysisConfigType } from '../../../../../../../common/types/data_frame_analytics';
import { getStringBasedClassName } from './use_classification_path_data';

interface DecisionPathPopoverProps {
  featureImportance: FeatureImportance[];
  analysisType: DataFrameAnalysisConfigType;
  predictionFieldName?: string;
  baseline?: FeatureImportanceBaseline;
  predictedValue?: number | string | undefined;
  predictedProbability?: number; // for classification
  topClasses?: TopClasses;
}

enum DECISION_PATH_TABS {
  CHART = 'decision_path_chart',
  JSON = 'decision_path_json',
}

export interface ExtendedFeatureImportance extends FeatureImportance {
  absImportance: number;
}

export const DecisionPathPopover: FC<DecisionPathPopoverProps> = ({
  baseline,
  featureImportance,
  predictedValue,
  topClasses,
  analysisType,
  predictionFieldName,
  predictedProbability,
}) => {
  const [selectedTabId, setSelectedTabId] = useState(DECISION_PATH_TABS.CHART);
  const {
    services: { docLinks },
  } = useMlKibana();
  const docLink = docLinks.links.ml.featureImportance;

  if (featureImportance.length < 2) {
    return (
      <div data-test-subj="mlDFADecisionPathJSONViewer">
        <DecisionPathJSONViewer featureImportance={featureImportance} />
      </div>
    );
  }

  const tabs = [
    {
      id: DECISION_PATH_TABS.CHART,
      name: (
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.explorationResults.decisionPathPlotTab"
          defaultMessage="Decision plot"
        />
      ),
    },
    {
      id: DECISION_PATH_TABS.JSON,
      name: (
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.explorationResults.decisionPathJSONTab"
          defaultMessage="JSON"
        />
      ),
    },
  ];

  return (
    <div data-test-subj="mlDFADecisionPathPopover">
      <div style={{ display: 'flex', width: 300 }}>
        <EuiTabs size={'s'}>
          {tabs.map((tab) => (
            <EuiTab
              data-test-subj={`mlDFADecisionPathPopoverTab-${tab.id}`}
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
              defaultMessage="SHAP decision plots use {linkedFeatureImportanceValues} to show how models arrive at the predicted value for '{predictionFieldName}'."
              values={{
                predictionFieldName,
                linkedFeatureImportanceValues: (
                  <EuiLink href={docLink} target="_blank">
                    <FormattedMessage
                      id="xpack.ml.dataframe.analytics.explorationResults.linkedFeatureImportanceValues"
                      defaultMessage="feature importance values"
                    />
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
          {analysisType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION &&
            isClassificationFeatureImportanceBaseline(baseline) && (
              <ClassificationDecisionPath
                featureImportance={featureImportance}
                topClasses={topClasses as TopClasses}
                predictedValue={getStringBasedClassName(predictedValue)}
                predictedProbability={predictedProbability}
                predictionFieldName={predictionFieldName}
                baseline={baseline}
              />
            )}
          {analysisType === ANALYSIS_CONFIG_TYPE.REGRESSION &&
            isRegressionFeatureImportanceBaseline(baseline) &&
            predictedValue !== undefined && (
              <RegressionDecisionPath
                featureImportance={featureImportance}
                baseline={baseline}
                predictedValue={
                  typeof predictedValue === 'string' ? parseFloat(predictedValue) : predictedValue
                }
                predictionFieldName={predictionFieldName}
              />
            )}
        </>
      )}
      {selectedTabId === DECISION_PATH_TABS.JSON && (
        <DecisionPathJSONViewer featureImportance={featureImportance} />
      )}
    </div>
  );
};
