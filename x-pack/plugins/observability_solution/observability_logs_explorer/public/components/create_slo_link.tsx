/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink, EuiToolTip } from '@elastic/eui';
import { hydrateDatasetSelection } from '@kbn/logs-explorer-plugin/common';
import { MatchedStateFromActor } from '@kbn/xstate-utils';
import React, { useMemo, useState } from 'react';
import { ObservabilityPublicStart } from '@kbn/observability-plugin/public';
import { useActor } from '@xstate/react';
import { sloFeatureId } from '@kbn/observability-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { getDiscoverFiltersFromState } from '@kbn/logs-explorer-plugin/public';
import { createSLoLabel } from '../../common/translations';
import {
  ObservabilityLogsExplorerService,
  useObservabilityLogsExplorerPageStateContext,
} from '../state_machines/observability_logs_explorer/src';

type InitializedPageState = MatchedStateFromActor<
  ObservabilityLogsExplorerService,
  { initialized: 'validLogsExplorerState' }
>;

export const CreateSloLinkForValidState = React.memo(
  ({
    observability: { getCreateSLOFlyout: CreateSloFlyout },
  }: {
    observability: ObservabilityPublicStart;
  }) => {
    const [pageState] = useActor(useObservabilityLogsExplorerPageStateContext());

    const {
      context: { logsExplorerState },
    } = pageState as InitializedPageState;

    const capabilities = useKibana().services?.application?.capabilities;

    const hasWriteCapabilities = !!capabilities?.[sloFeatureId].write ?? false;

    const [isCreateFlyoutOpen, setCreateSLOFlyoutOpen] = useState(false);

    const sloParams = useMemo(() => {
      if (!logsExplorerState)
        return {
          indicator: {
            type: 'sli.kql.custom' as const,
            params: {},
          },
        };
      const dataView = hydrateDatasetSelection(logsExplorerState.datasetSelection).toDataviewSpec();
      const query =
        logsExplorerState?.query && 'query' in logsExplorerState.query
          ? String(logsExplorerState.query.query)
          : undefined;
      const allFilters = getDiscoverFiltersFromState(
        dataView.id,
        logsExplorerState.filters,
        logsExplorerState.controls
      );
      return {
        indicator: {
          type: 'sli.kql.custom' as const,
          params: {
            index: dataView.title,
            timestampField: dataView?.timeFieldName,
            filter:
              allFilters.length > 0
                ? {
                    kqlQuery: query,
                    filters: getDiscoverFiltersFromState(
                      dataView.id,
                      logsExplorerState.filters,
                      logsExplorerState.controls
                    ),
                  }
                : query,
          },
        },
        groupBy: logsExplorerState.chart.breakdownField ?? undefined,
      };
    }, [logsExplorerState]);

    return (
      <>
        <EuiToolTip
          content={
            !hasWriteCapabilities ? (
              <FormattedMessage
                id="xpack.observabilityLogsExplorer.createSLO.tooltip"
                defaultMessage="You need the SLO feature 'write' capability to create an SLO."
              />
            ) : (
              ''
            )
          }
        >
          <EuiHeaderLink
            isDisabled={!hasWriteCapabilities}
            color="primary"
            onClick={() => {
              setCreateSLOFlyoutOpen(true);
            }}
            iconType="visGauge"
          >
            {createSLoLabel}
          </EuiHeaderLink>
        </EuiToolTip>
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
