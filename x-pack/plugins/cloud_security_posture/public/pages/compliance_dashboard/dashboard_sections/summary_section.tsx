/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { PartitionElementEvent } from '@elastic/charts';
import { Query } from '@kbn/es-query';
import { ScorePerAccountChart } from '../compliance_charts/score_per_account_chart';
import { ChartPanel } from '../../../components/chart_panel';
import { useCloudPostureStatsApi } from '../../../common/api';
import * as TEXT from '../translations';
import { CloudPostureScoreChart } from '../compliance_charts/cloud_posture_score_chart';
import { allNavigationItems } from '../../../common/navigation/constants';
import { encodeQuery } from '../../../common/navigation/query_utils';
import { Evaluation } from '../../../../common/types';
import { RisksTable } from '../compliance_charts/risks_table';

const getEvaluationQuery = (evaluation: Evaluation): Query => ({
  language: 'kuery',
  query: `"result.evaluation : "${evaluation}"`,
});

const defaultHeight = 360;

// TODO: limit this to desktop media queries only
const summarySectionWrapperStyle = {
  height: defaultHeight,
};

export const SummarySection = () => {
  const history = useHistory();
  const getStats = useCloudPostureStatsApi();
  if (!getStats.isSuccess) return null;

  const handleElementClick = (elements: PartitionElementEvent[]) => {
    const [element] = elements;
    const [layerValue] = element;
    const rollupValue = layerValue[0].groupByRollup as Evaluation;

    history.push({
      pathname: allNavigationItems.findings.path,
      search: encodeQuery(getEvaluationQuery(rollupValue)),
    });
  };

  return (
    <EuiFlexGrid columns={3} style={summarySectionWrapperStyle}>
      <EuiFlexItem>
        <ChartPanel
          title={TEXT.CLOUD_POSTURE_SCORE}
          isLoading={getStats.isLoading}
          isError={getStats.isError}
        >
          <CloudPostureScoreChart
            id="cloud_posture_score_chart"
            data={getStats.data}
            partitionOnElementClick={handleElementClick}
          />
        </ChartPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <ChartPanel title={TEXT.RISKS} isLoading={getStats.isLoading} isError={getStats.isError}>
          <RisksTable data={getStats.data.resourceTypesAggs} />
        </ChartPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <ChartPanel
          title={TEXT.SCORE_PER_CLUSTER_CHART_TITLE}
          isLoading={getStats.isLoading}
          isError={getStats.isError}
        >
          {/* TODO: no api for this chart yet, using empty state for now. needs BE */}
          <ScorePerAccountChart />
        </ChartPanel>
      </EuiFlexItem>
    </EuiFlexGrid>
  );
};
