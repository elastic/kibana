/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';

import { HeaderSection } from '../../../common/components/header_section';
import { InspectButtonContainer } from '../../../common/components/inspect';

import type {
  HostRiskScore,
  RiskScoreEntity,
  UserRiskScore,
} from '../../../../common/search_strategy';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';
import { getRiskScoreOverTimeAreaAttributes } from '../../lens_attributes/risk_score_over_time_area';

export interface RiskScoreOverTimeProps {
  from: string;
  to: string;
  loading: boolean;
  riskScore?: Array<HostRiskScore | UserRiskScore>;
  riskEntity: RiskScoreEntity;
  queryId: string;
  title: string;
  toggleStatus: boolean;
  toggleQuery?: (status: boolean) => void;
}

const CHART_HEIGHT = 180;

export const scoreFormatter = (d: number) => Math.round(d).toString();

const RiskScoreOverTimeComponent: React.FC<RiskScoreOverTimeProps> = ({
  from,
  to,
  riskScore,
  loading,
  queryId,
  riskEntity,
  title,
  toggleStatus,
  toggleQuery,
}) => {
  const spaceId = useSpaceId();
  const timerange = useMemo(
    () => ({
      from,
      to,
    }),
    [from, to]
  );
  return (
    <InspectButtonContainer>
      <EuiPanel hasBorder data-test-subj="RiskScoreOverTime">
        <EuiFlexGroup gutterSize={'none'}>
          <EuiFlexItem grow={1}>
            <HeaderSection
              title={title}
              hideSubtitle
              toggleQuery={toggleQuery}
              toggleStatus={toggleStatus}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        {toggleStatus && (
          <EuiFlexGroup gutterSize="none" direction="column">
            <EuiFlexItem grow={1}>
              {spaceId && (
                <VisualizationEmbeddable
                  applyGlobalQueriesAndFilters={false}
                  timerange={timerange}
                  getLensAttributes={getRiskScoreOverTimeAreaAttributes}
                  stackByField={riskEntity}
                  id={`${queryId}-embeddable`}
                  height={CHART_HEIGHT}
                  extraOptions={{ spaceId }}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiPanel>
    </InspectButtonContainer>
  );
};

RiskScoreOverTimeComponent.displayName = 'RiskScoreOverTimeComponent';
export const RiskScoreOverTime = React.memo(RiskScoreOverTimeComponent);
RiskScoreOverTime.displayName = 'RiskScoreOverTime';
