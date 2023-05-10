/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { RiskScoreEntity, RiskSeverity } from '../../../../../common/search_strategy';
import { EMPTY_SEVERITY_COUNT } from '../../../../../common/search_strategy';
import { getRiskScoreDonutAttributes } from '../../../../common/components/visualization_actions/lens_attributes/common/risk_scores/risk_score_donut';
import { VisualizationEmbeddable } from '../../../../common/components/visualization_actions/visualization_embeddable';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import type { SeverityCount } from '../../../../explore/components/risk_score/severity/types';
import { generateSeverityFilter } from '../../../../explore/hosts/store/helpers';
import { RiskScoreDonutChart } from '../common/risk_score_donut_chart';
import { TOTAL_LABEL } from '../common/translations';

const CHART_HEIGHT = 180;
const ChartContentComponent = ({
  dataExists,
  kpiQueryId,
  riskEntity,
  severityCount,
  timerange,
  selectedSeverity,
}: {
  dataExists?: boolean;
  kpiQueryId: string;
  riskEntity: RiskScoreEntity;
  severityCount: SeverityCount | undefined;
  timerange: {
    from: string;
    to: string;
  };
  selectedSeverity: RiskSeverity[];
}) => {
  const isDonutChartEmbeddablesEnabled = useIsExperimentalFeatureEnabled(
    'donutChartEmbeddablesEnabled'
  );
  const spaceId = useSpaceId();
  const extraOptions = useMemo(
    () => ({ spaceId, filters: generateSeverityFilter(selectedSeverity, riskEntity) }),
    [spaceId, selectedSeverity, riskEntity]
  );

  return (
    <>
      {isDonutChartEmbeddablesEnabled && spaceId && dataExists && (
        <VisualizationEmbeddable
          applyGlobalQueriesAndFilters={false}
          donutTextWrapperClassName="risk-score"
          extraOptions={extraOptions}
          getLensAttributes={getRiskScoreDonutAttributes}
          height={CHART_HEIGHT}
          id={`${kpiQueryId}-donut`}
          isDonut={true}
          label={TOTAL_LABEL}
          stackByField={riskEntity}
          timerange={timerange}
          width="270px"
        />
      )}
      {!isDonutChartEmbeddablesEnabled && (
        <RiskScoreDonutChart severityCount={severityCount ?? EMPTY_SEVERITY_COUNT} />
      )}
    </>
  );
};

export const ChartContent = React.memo(ChartContentComponent);
