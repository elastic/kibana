/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useMlKibana } from '../../../../../contexts/kibana';
import { SavedSearchQuery } from '../../../../../contexts/ml';
import {
  getValuesFromResponse,
  getDependentVar,
  getPredictionFieldName,
  loadEvalData,
  loadDocsCount,
  Eval,
  DataFrameAnalyticsConfig,
} from '../../../../common';
import { getTaskStateBadge } from '../../../analytics_management/components/analytics_list/use_columns';
import { DATA_FRAME_TASK_STATE } from '../../../analytics_management/components/analytics_list/common';
import { EvaluateStat } from './evaluate_stat';
import {
  isResultsSearchBoolQuery,
  isRegressionEvaluateResponse,
  ANALYSIS_CONFIG_TYPE,
  REGRESSION_STATS,
  EMPTY_STAT,
} from '../../../../common/analytics';

interface Props {
  jobConfig: DataFrameAnalyticsConfig;
  jobStatus?: DATA_FRAME_TASK_STATE;
  searchQuery: SavedSearchQuery;
}

const EMPTY_STATS = {
  mse: EMPTY_STAT,
  msle: EMPTY_STAT,
  huber: EMPTY_STAT,
  rSquared: EMPTY_STAT,
};

const defaultEval: Eval = {
  ...EMPTY_STATS,
  error: null,
};

export const EvaluatePanel: FC<Props> = ({ jobConfig, jobStatus, searchQuery }) => {
  const {
    services: { docLinks },
  } = useMlKibana();
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;
  const [trainingEval, setTrainingEval] = useState<Eval>(defaultEval);
  const [generalizationEval, setGeneralizationEval] = useState<Eval>(defaultEval);
  const [isLoadingTraining, setIsLoadingTraining] = useState<boolean>(false);
  const [isLoadingGeneralization, setIsLoadingGeneralization] = useState<boolean>(false);
  const [isTrainingFilter, setIsTrainingFilter] = useState<boolean | undefined>(undefined);
  const [trainingDocsCount, setTrainingDocsCount] = useState<null | number>(null);
  const [generalizationDocsCount, setGeneralizationDocsCount] = useState<null | number>(null);

  const index = jobConfig.dest.index;
  const dependentVariable = getDependentVar(jobConfig.analysis);
  const predictionFieldName = getPredictionFieldName(jobConfig.analysis);
  // default is 'ml'
  const resultsField = jobConfig.dest.results_field;

  const loadGeneralizationData = async (ignoreDefaultQuery: boolean = true) => {
    setIsLoadingGeneralization(true);

    const genErrorEval = await loadEvalData({
      isTraining: false,
      index,
      dependentVariable,
      resultsField,
      predictionFieldName,
      searchQuery,
      ignoreDefaultQuery,
      jobType: ANALYSIS_CONFIG_TYPE.REGRESSION,
    });

    if (
      genErrorEval.success === true &&
      genErrorEval.eval &&
      isRegressionEvaluateResponse(genErrorEval.eval)
    ) {
      const { mse, msle, huber, r_squared } = getValuesFromResponse(genErrorEval.eval);
      setGeneralizationEval({
        mse,
        msle,
        huber,
        rSquared: r_squared,
        error: null,
      });
      setIsLoadingGeneralization(false);
    } else {
      setIsLoadingGeneralization(false);
      setGeneralizationEval({
        ...EMPTY_STATS,
        error: genErrorEval.error,
      });
    }
  };

  const loadTrainingData = async (ignoreDefaultQuery: boolean = true) => {
    setIsLoadingTraining(true);

    const trainingErrorEval = await loadEvalData({
      isTraining: true,
      index,
      dependentVariable,
      resultsField,
      predictionFieldName,
      searchQuery,
      ignoreDefaultQuery,
      jobType: ANALYSIS_CONFIG_TYPE.REGRESSION,
    });

    if (
      trainingErrorEval.success === true &&
      trainingErrorEval.eval &&
      isRegressionEvaluateResponse(trainingErrorEval.eval)
    ) {
      const { mse, msle, huber, r_squared } = getValuesFromResponse(trainingErrorEval.eval);
      setTrainingEval({
        mse,
        msle,
        huber,
        rSquared: r_squared,
        error: null,
      });
      setIsLoadingTraining(false);
    } else {
      setIsLoadingTraining(false);
      setTrainingEval({
        ...EMPTY_STATS,
        error: trainingErrorEval.error,
      });
    }
  };

  const loadData = async () => {
    loadGeneralizationData(false);
    const genDocsCountResp = await loadDocsCount({
      ignoreDefaultQuery: false,
      isTraining: false,
      searchQuery,
      resultsField,
      destIndex: jobConfig.dest.index,
    });
    if (genDocsCountResp.success === true) {
      setGeneralizationDocsCount(genDocsCountResp.docsCount);
    } else {
      setGeneralizationDocsCount(null);
    }

    loadTrainingData(false);
    const trainDocsCountResp = await loadDocsCount({
      ignoreDefaultQuery: false,
      isTraining: true,
      searchQuery,
      resultsField,
      destIndex: jobConfig.dest.index,
    });
    if (trainDocsCountResp.success === true) {
      setTrainingDocsCount(trainDocsCountResp.docsCount);
    } else {
      setTrainingDocsCount(null);
    }
  };

  useEffect(() => {
    let isTraining: boolean | undefined;
    const query =
      isResultsSearchBoolQuery(searchQuery) && (searchQuery.bool.should || searchQuery.bool.filter);

    if (query !== undefined && query !== false) {
      for (let i = 0; i < query.length; i++) {
        const clause = query[i];

        if (clause.match && clause.match[`${resultsField}.is_training`] !== undefined) {
          isTraining = clause.match[`${resultsField}.is_training`];
          break;
        } else if (
          clause.bool &&
          (clause.bool.should !== undefined || clause.bool.filter !== undefined)
        ) {
          const innerQuery = clause.bool.should || clause.bool.filter;
          if (innerQuery !== undefined) {
            for (let j = 0; j < innerQuery.length; j++) {
              const innerClause = innerQuery[j];
              if (
                innerClause.match &&
                innerClause.match[`${resultsField}.is_training`] !== undefined
              ) {
                isTraining = innerClause.match[`${resultsField}.is_training`];
                break;
              }
            }
          }
        }
      }
    }

    setIsTrainingFilter(isTraining);
    loadData();
  }, [JSON.stringify(searchQuery)]);

  return (
    <EuiPanel data-test-subj="mlDFAnalyticsRegressionExplorationEvaluatePanel">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <span>
              {i18n.translate(
                'xpack.ml.dataframe.analytics.regressionExploration.evaluateJobIdTitle',
                {
                  defaultMessage: 'Evaluation of regression job ID {jobId}',
                  values: { jobId: jobConfig.id },
                }
              )}
            </span>
          </EuiTitle>
        </EuiFlexItem>
        {jobStatus !== undefined && (
          <EuiFlexItem grow={false}>
            <span>{getTaskStateBadge(jobStatus)}</span>
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiSpacer />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            target="_blank"
            iconType="help"
            iconSide="left"
            color="primary"
            href={`${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-dfanalytics-evaluate.html#ml-dfanalytics-regression-evaluation`}
          >
            {i18n.translate(
              'xpack.ml.dataframe.analytics.regressionExploration.regressionDocsLink',
              {
                defaultMessage: 'Regression evaluation docs ',
              }
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <span>
              {i18n.translate(
                'xpack.ml.dataframe.analytics.regressionExploration.generalizationErrorTitle',
                {
                  defaultMessage: 'Generalization error',
                }
              )}
            </span>
          </EuiTitle>
          {generalizationDocsCount !== null && (
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.ml.dataframe.analytics.regressionExploration.generalizationDocsCount"
                defaultMessage="{docsCount, plural, one {# doc} other {# docs}} evaluated"
                values={{ docsCount: generalizationDocsCount }}
              />
              {isTrainingFilter === true && generalizationDocsCount === 0 && (
                <FormattedMessage
                  id="xpack.ml.dataframe.analytics.regressionExploration.generalizationFilterText"
                  defaultMessage=". Filtering for training data."
                />
              )}
            </EuiText>
          )}
          <EuiSpacer />
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem>
              <EuiFlexGroup direction="column" gutterSize="s">
                {/* First row stats */}
                <EuiFlexItem>
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EvaluateStat
                        dataTestSubj={'mlDFAnalyticsRegressionGenMSEstat'}
                        isLoading={isLoadingGeneralization}
                        title={generalizationEval.mse}
                        statType={REGRESSION_STATS.MSE}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EvaluateStat
                        dataTestSubj={'mlDFAnalyticsRegressionGenRSquaredStat'}
                        isLoading={isLoadingGeneralization}
                        title={generalizationEval.rSquared}
                        statType={REGRESSION_STATS.R_SQUARED}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                {/* Second row stats */}
                <EuiFlexItem>
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EvaluateStat
                        dataTestSubj={'mlDFAnalyticsRegressionGenMsleStat'}
                        isLoading={isLoadingGeneralization}
                        title={generalizationEval.msle}
                        statType={REGRESSION_STATS.MSLE}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EvaluateStat
                        dataTestSubj={'mlDFAnalyticsRegressionGenHuberStat'}
                        isLoading={isLoadingGeneralization}
                        title={generalizationEval.huber}
                        statType={REGRESSION_STATS.HUBER}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {generalizationEval.error !== null && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="danger">
                  {generalizationEval.error}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <span>
              {i18n.translate(
                'xpack.ml.dataframe.analytics.regressionExploration.trainingErrorTitle',
                {
                  defaultMessage: 'Training error',
                }
              )}
            </span>
          </EuiTitle>
          {trainingDocsCount !== null && (
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.ml.dataframe.analytics.regressionExploration.trainingDocsCount"
                defaultMessage="{docsCount, plural, one {# doc} other {# docs}} evaluated"
                values={{ docsCount: trainingDocsCount }}
              />
              {isTrainingFilter === false && trainingDocsCount === 0 && (
                <FormattedMessage
                  id="xpack.ml.dataframe.analytics.regressionExploration.trainingFilterText"
                  defaultMessage=". Filtering for testing data."
                />
              )}
            </EuiText>
          )}
          <EuiSpacer />
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem>
              <EuiFlexGroup direction="column" gutterSize="s">
                {/* First row stats */}
                <EuiFlexItem>
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EvaluateStat
                        dataTestSubj={'mlDFAnalyticsRegressionTrainingMSEstat'}
                        isLoading={isLoadingTraining}
                        title={trainingEval.mse}
                        statType={REGRESSION_STATS.MSE}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EvaluateStat
                        dataTestSubj={'mlDFAnalyticsRegressionTrainingRSquaredStat'}
                        isLoading={isLoadingTraining}
                        title={trainingEval.rSquared}
                        statType={REGRESSION_STATS.R_SQUARED}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                {/* Second row stats */}
                <EuiFlexItem>
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EvaluateStat
                        dataTestSubj={'mlDFAnalyticsRegressionTrainingMsleStat'}
                        isLoading={isLoadingTraining}
                        title={trainingEval.msle}
                        statType={REGRESSION_STATS.MSLE}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EvaluateStat
                        dataTestSubj={'mlDFAnalyticsRegressionTrainingHuberStat'}
                        isLoading={isLoadingTraining}
                        title={trainingEval.huber}
                        statType={REGRESSION_STATS.HUBER}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {trainingEval.error !== null && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="danger">
                  {trainingEval.error}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
