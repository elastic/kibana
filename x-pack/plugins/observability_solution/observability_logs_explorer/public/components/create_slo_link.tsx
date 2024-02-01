/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink } from '@elastic/eui';
import { hydrateDatasetSelection } from '@kbn/logs-explorer-plugin/common';
import { MatchedStateFromActor } from '@kbn/xstate-utils';
import React, { useMemo, useState } from 'react';
import { ObservabilityPublicStart } from '@kbn/observability-plugin/public';
import { useActor } from '@xstate/react';
import { createSLoLabel } from '../../common/translations';
import {
  ObservabilityLogExplorerService,
  useObservabilityLogExplorerPageStateContext,
} from '../state_machines/observability_log_explorer/src';

type InitializedPageState = MatchedStateFromActor<
  ObservabilityLogExplorerService,
  { initialized: 'validLogExplorerState' }
>;

export const CreateSloLinkForValidState = React.memo(
  ({
    observability: { getCreateSLOFlyout: CreateSloFlyout },
  }: {
    observability: ObservabilityPublicStart;
  }) => {
    const [pageState] = useActor(useObservabilityLogExplorerPageStateContext());

    const {
      context: { logExplorerState },
    } = pageState as InitializedPageState;

    const [isCreateFlyoutOpen, setCreateSLOFlyoutOpen] = useState(false);

    const sloParams = useMemo(() => {
      if (!logExplorerState)
        return {
          indicator: {
            type: 'sli.kql.custom' as const,
            params: {},
          },
        };
      const dataView = hydrateDatasetSelection(logExplorerState.datasetSelection).toDataviewSpec();
      const query =
        logExplorerState?.query && 'query' in logExplorerState.query
          ? String(logExplorerState.query.query)
          : undefined;
      return {
        indicator: {
          type: 'sli.kql.custom' as const,
          params: {
            index: dataView.title,
            timestampField: dataView?.timeFieldName,
            good: query,
          },
        },
        groupBy: logExplorerState.chart.breakdownField ?? undefined,
      };
    }, [logExplorerState]);

    return (
      <>
        <EuiHeaderLink
          onClick={() => {
            setCreateSLOFlyoutOpen(true);
          }}
          iconType="visGauge"
        >
          {createSLoLabel}
        </EuiHeaderLink>
        {isCreateFlyoutOpen && (
          <CreateSloFlyout
            onClose={() => setCreateSLOFlyoutOpen(false)}
            initialValues={sloParams}
          />
        )}
      </>
    );
  }
);
