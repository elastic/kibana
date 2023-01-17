/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { RiskScoreEntity } from '../../../../../common/search_strategy';
import { EMPTY_SEVERITY_COUNT } from '../../../../../common/search_strategy';
import { getRiskScoreDonutAttributes } from '../../../../common/components/visualization_actions/lens_attributes/common/risk_scores/risk_score_donut';
import { VisualizationEmbeddable } from '../../../../common/components/visualization_actions/visualization_embeddable';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import type { SeverityCount } from '../../../../explore/components/risk_score/severity/types';
import { RiskScoreDonutChart } from '../common/risk_score_donut_chart';
import { TOTAL_LABEL } from '../common/translations';

const ChartContentComponent = ({
  dataExists,
  kpiQueryId,
  riskEntity,
  severityCount,
  timerange,
}: {
  dataExists?: boolean;
  kpiQueryId: string;
  riskEntity: RiskScoreEntity;
  severityCount: SeverityCount | undefined;
  timerange: {
    from: string;
    to: string;
  };
}) => {
  const isChartEmbeddablesEnabled = useIsExperimentalFeatureEnabled('chartEmbeddablesEnabled');
  const spaceId = useSpaceId();
  const extraOptions = useMemo(() => ({ spaceId }), [spaceId]);

  return (
    <>
      {isChartEmbeddablesEnabled && spaceId && dataExists && (
        <VisualizationEmbeddable
          applyGlobalQueriesAndFilters={false}
          extraOptions={extraOptions}
          getLensAttributes={getRiskScoreDonutAttributes}
          height="140px"
          id={`${kpiQueryId}-donut`}
          isDonut={true}
          label={TOTAL_LABEL}
          stackByField={riskEntity}
          timerange={timerange}
        />
      )}
      {!isChartEmbeddablesEnabled && (
        <RiskScoreDonutChart severityCount={severityCount ?? EMPTY_SEVERITY_COUNT} />
      )}
    </>
  );
};

export const ChartContent = React.memo(ChartContentComponent);
