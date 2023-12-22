/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule } from '@elastic/eui';

import React from 'react';
import type { RiskScoreState } from '../../../entity_analytics/api/hooks/use_risk_score';
import type { HostItem, RiskScoreEntity } from '../../../../common/search_strategy';
import { FlyoutBody } from '../../shared/components/flyout_body';
import { ObservedEntity } from '../shared/components/observed_entity';
import { HOST_PANEL_OBSERVED_HOST_QUERY_ID } from '.';
import type { ObservedEntityData } from '../shared/components/observed_entity/types';
import { useObservedHostFields } from './hooks/use_observed_host_fields';

interface HostPanelContentProps {
  observedHost: ObservedEntityData<HostItem>;
  riskScoreState: RiskScoreState<RiskScoreEntity.user>;
  contextID: string;
  scopeId: string;
  isDraggable: boolean;
}

export const HostPanelContent = ({
  observedHost,
  riskScoreState,
  contextID,
  scopeId,
  isDraggable,
}: HostPanelContentProps) => {
  const observedFields = useObservedHostFields(observedHost);

  return (
    <FlyoutBody>
      {riskScoreState.isModuleEnabled && riskScoreState.data?.length !== 0 && (
        <>
          {/* TODO <RiskSummary riskScoreData={riskScoreState} queryId={HOST_PANEL_RISK_SCORE_QUERY_ID} /> */}
          <EuiHorizontalRule margin="m" />
        </>
      )}
      <ObservedEntity
        observedData={observedHost}
        contextID={contextID}
        scopeId={scopeId}
        isDraggable={isDraggable}
        observedFields={observedFields}
        queryId={HOST_PANEL_OBSERVED_HOST_QUERY_ID}
      />
    </FlyoutBody>
  );
};
