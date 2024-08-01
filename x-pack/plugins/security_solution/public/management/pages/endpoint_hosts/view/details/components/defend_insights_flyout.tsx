/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { get as _get } from 'lodash';

import type { DefendInsights } from '@kbn/elastic-assistant-common';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { useLoadConnectors } from '@kbn/elastic-assistant';

import type { HostMetadata } from '../../../../../../../common/endpoint/types';

import { useKibana } from '../../../../../../common/lib/kibana';
import { useDefendInsights } from '../../hooks/defend_insights';

export const DefendInsightsFlyout = memo<{
  hostMeta: HostMetadata;
}>(({ hostMeta }) => {
  const { http } = useKibana().services;
  const { data: aiConnectors } = useLoadConnectors({
    http,
  });
  const isDisabled = !(aiConnectors && aiConnectors[0].id);

  const { fetchDefendInsights, insights, isLoading } = useDefendInsights({
    endpointIds: [hostMeta.agent.id],
    insightType: 'conflicting_antivirus',
  });

  const [insightData, setInsightData] = useState<DefendInsights | null>(null);

  useEffect(() => {
    setInsightData(insights);
  }, [insights]);

  const handleOnClick = useCallback(() => {
    fetchDefendInsights();
  }, [fetchDefendInsights]);

  return (
    <EuiFlyoutBody>
      <EuiButton fill onClick={handleOnClick} disabled={isLoading || isDisabled}>
        {'Generate'}
      </EuiButton>
      {isLoading && <EuiLoadingSpinner size="m" />}
      <EuiSpacer />
      <div>{`Insights: ${insightData?.length}`}</div>
      <EuiSpacer />
      <EuiFlexGroup direction="column">
        {insightData?.map((insight, i) => {
          const program = _get(insight, 'metadata.program', '');
          if (!program) return <></>;
          return (
            <EuiFlexItem key={`insight-${i}`}>
              <EuiPanel grow={false}>{program}</EuiPanel>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </EuiFlyoutBody>
  );
});
DefendInsightsFlyout.displayName = 'DefendInsightsFlyout';
