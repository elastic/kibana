/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import { EuiLink, EuiTab, EuiTabs, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { RegressionDecisionPath } from './decision_path_regression';
import { DecisionPathJSONViewer } from './decision_path_json_viewer';
import { FeatureImportance, TopClasses } from '../../../../../common/types/feature_importance';
import { ANALYSIS_CONFIG_TYPE } from '../../../data_frame_analytics/common';
import { ClassificationDecisionPath } from './decision_path_classification';
import { useMlKibana } from '../../../contexts/kibana';
import { DataFrameAnalysisConfigType } from '../../../../../common/types/data_frame_analytics';

interface DecisionPathPopoverProps {
  featureImportance: FeatureImportance[];
  analysisType: DataFrameAnalysisConfigType;
  predictionFieldName?: string;
  baseline?: number;
  predictedValue?: number | string | undefined;
  topClasses?: TopClasses;
}

enum DECISION_PATH_TABS {
  CHART = 'decision_path_chart',
  JSON = 'decision_path_json',
}

export interface ExtendedFeatureImportance extends FeatureImportance {
  absImportance?: number;
}

export const DecisionPathPopover: FC<DecisionPathPopoverProps> = ({
  baseline,
  featureImportance,
  predictedValue,
  topClasses,
  analysisType,
  predictionFieldName,
}) => {
  const [selectedTabId, setSelectedTabId] = useState(DECISION_PATH_TABS.CHART);
  const {
    services: { docLinks },
  } = useMlKibana();
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;

  if (featureImportance.length < 2) {
    return <DecisionPathJSONViewer featureImportance={featureImportance} />;
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
              defaultMessage="SHAP decision plots use {linkedFeatureImportanceValues} to show how models arrive at the predicted value for '{predictionFieldName}'."
              values={{
                predictionFieldName,
                linkedFeatureImportanceValues: (
                  <EuiLink
                    href={`${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-feature-importance.html`}
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
          {analysisType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION && (
            <ClassificationDecisionPath
              featureImportance={featureImportance}
              topClasses={topClasses as TopClasses}
              predictedValue={predictedValue as string}
              predictionFieldName={predictionFieldName}
            />
          )}
          {analysisType === ANALYSIS_CONFIG_TYPE.REGRESSION && (
            <RegressionDecisionPath
              featureImportance={featureImportance}
              baseline={baseline}
              predictedValue={predictedValue as number}
              predictionFieldName={predictionFieldName}
            />
          )}
        </>
      )}
      {selectedTabId === DECISION_PATH_TABS.JSON && (
        <DecisionPathJSONViewer featureImportance={featureImportance} />
      )}
    </>
  );
};
