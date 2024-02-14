/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React, { useMemo } from 'react';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { useActor } from '@xstate/react';
import { css } from '@emotion/react';
import { InventoryFiltersState, InventoryOptionsState } from '../../../../common/inventory_views';
import {
  InventoryPageTime,
  useInventoryPageStateContext,
} from '../../../observability_infra/inventory_page/state';
import { FilterBar } from './components/filter_bar';
import { SourceErrorPage } from '../../../components/source_error_page';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { useSourceContext } from '../../../containers/metrics_source';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { LayoutView } from './components/layout_view';
import { MetricsPageTemplate } from '../page_template';
import { inventoryTitle } from '../../../translations';
import { SavedViews } from './components/saved_views';
import { SnapshotContainer } from './components/snapshot_container';
import { fullHeightContentStyles } from '../../../page_template.styles';
import { SurveySection } from './components/survey_section';
import { NoRemoteCluster } from '../../../components/empty_states';

export const SnapshotPage = () => {
  const { isLoading, loadSourceFailureMessage, loadSource, source } = useSourceContext();
  const inventoryPageStateService = useInventoryPageStateContext();
  const [inventoryPageState, inventoryPageSend] = useActor(inventoryPageStateService);

  useTrackPageview({ app: 'infra_metrics', path: 'inventory' });
  useTrackPageview({ app: 'infra_metrics', path: 'inventory', delay: 15000 });

  useMetricsBreadcrumbs([
    {
      text: inventoryTitle,
    },
  ]);

  const { metricIndicesExist, remoteClustersExist } = source?.status ?? {};

  const pageStateCallbacks = useMemo(() => {
    return {
      updateTime: (time: Partial<InventoryPageTime>) => {
        inventoryPageSend({
          type: 'TIME_CHANGED',
          time,
        });
      },
      updateOptions: (options: Partial<InventoryOptionsState>) => {
        inventoryPageSend({
          type: 'OPTIONS_CHANGED',
          options,
        });
      },
      updateFilter: (filter: Partial<InventoryFiltersState>) => {
        inventoryPageSend({
          type: 'FILTER_CHANGED',
          filter,
        });
      },
    };
  }, [inventoryPageSend]);

  if (isLoading && !source) return <SourceLoadingPage />;

  if (!remoteClustersExist) {
    return <NoRemoteCluster />;
  }

  if (!metricIndicesExist) {
    return (
      <MetricsPageTemplate hasData={metricIndicesExist} data-test-subj="noMetricsIndicesPrompt" />
    );
  }

  if (loadSourceFailureMessage)
    return <SourceErrorPage errorMessage={loadSourceFailureMessage || ''} retry={loadSource} />;

  return (
    <EuiErrorBoundary>
      <div className={APP_WRAPPER_CLASS}>
        {inventoryPageState.matches('initialized') ? (
          <MetricsPageTemplate
            hasData={metricIndicesExist}
            pageHeader={{
              pageTitle: inventoryTitle,
              rightSideItems: [
                <SavedViews inventoryPageState={inventoryPageState} />,
                <SurveySection />,
              ],
            }}
            pageSectionProps={{
              contentProps: {
                css: css`
                  ${fullHeightContentStyles};
                  padding-bottom: 0;
                `,
              },
            }}
          >
            <SnapshotContainer
              inventoryPageState={inventoryPageState}
              render={({ loading, nodes, reload, interval }) => (
                <>
                  <FilterBar
                    interval={interval}
                    inventoryPageState={inventoryPageState}
                    inventoryPageCallbacks={pageStateCallbacks}
                  />
                  <LayoutView
                    loading={loading}
                    nodes={nodes}
                    reload={reload}
                    interval={interval}
                    inventoryPageState={inventoryPageState}
                    inventoryPageCallbacks={pageStateCallbacks}
                  />
                </>
              )}
            />
          </MetricsPageTemplate>
        ) : (
          <></>
        )}
      </div>
    </EuiErrorBoundary>
  );
};
