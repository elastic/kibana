/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import useAsync from 'react-use/lib/useAsync';
import {
  AwaitingDashboardAPI,
  DashboardCreationOptions,
  DashboardRenderer,
} from '@kbn/dashboard-plugin/public';
import { DashboardPanelMap, DashboardPanelState } from '@kbn/dashboard-plugin/common';
import type { LensEmbeddableInput } from '@kbn/lens-plugin/public';
import { EuiButton } from '@elastic/eui';
import { useKibanaContextForPlugin } from '../../../../../../hooks/use_kibana';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { useHostsViewContext } from '../../../hooks/use_hosts_view';
import { buildCombinedHostsFilter } from '../../../../../../utils/filters/build';
import { useHostsTableContext } from '../../../hooks/use_hosts_table';
import { useAfterLoadedState } from '../../../hooks/use_after_loaded_state';
import { useMetricsDataViewContext } from '../../../hooks/use_metrics_data_view';

export const PortableMetrics = () => {
  const model = findInventoryModel('host');
  const { dataView } = useMetricsDataViewContext();
  const [dashboard, setDashboard] = useState<AwaitingDashboardAPI>();

  const {
    services: { lens, dataViews },
  } = useKibanaContextForPlugin();

  const { searchCriteria } = useUnifiedSearchContext();
  const { loading, searchSessionId } = useHostsViewContext();
  const { currentPage } = useHostsTableContext();

  const shouldUseSearchCriteria = currentPage.length === 0;

  const { value: chartAttributes } = useAsync(async () => {
    const { formula: formulaAPI } = await lens.stateHelperApi();
    if (!dataViews || !formulaAPI || !dataView?.id) {
      return [];
    }
    const builder = new LensConfigBuilder(formulaAPI, dataViews);

    const dashboards = await model.metrics.getDashboards();
    const hostViewDashboard =
      dashboards?.hostsView.get({ metricsDataViewId: dataView?.id }).charts ?? [];

    return Promise.all(
      hostViewDashboard.map((chart) => builder.build(chart, { embeddable: true }))
    ).then((charts) => charts.filter((chart): chart is LensEmbeddableInput => !!chart));
  }, [dataViews]);

  // prevents searchCriteria state from reloading the chart
  // we want it to reload only once the table has finished loading.
  // attributes passed to useAfterLoadedState don't need to be memoized
  const { afterLoadedState } = useAfterLoadedState(loading, {
    dateRange: searchCriteria.dateRange,
    query: shouldUseSearchCriteria ? searchCriteria.query : undefined,
    searchSessionId,
  });

  const filters = useMemo(() => {
    return shouldUseSearchCriteria
      ? searchCriteria.filters
      : [
          buildCombinedHostsFilter({
            field: 'host.name',
            values: currentPage.map((p) => p.name),
            dataView,
          }),
        ];
  }, [shouldUseSearchCriteria, searchCriteria.filters, currentPage, dataView]);

  useEffect(() => {
    if (!dashboard) return;

    dashboard.updateInput({
      timeRange: afterLoadedState.dateRange,
      query: afterLoadedState.query,
      searchSessionId: afterLoadedState.searchSessionId,
      filters,
    });
  }, [
    afterLoadedState.dateRange,
    afterLoadedState.query,
    afterLoadedState.searchSessionId,
    dashboard,
    filters,
  ]);

  const getCreationOptions: () => Promise<DashboardCreationOptions> = useCallback(() => {
    const panels = convertSavedDashboardToPanels(chartAttributes);

    return Promise.resolve<DashboardCreationOptions>({
      getInitialInput: () => ({
        viewMode: ViewMode.VIEW,
        panels,
        timeRange: afterLoadedState.dateRange,
        query: afterLoadedState.query,
        searchSessionId: afterLoadedState.searchSessionId,
        filters,
        enhancements: {
          dynamicActions: {
            events: [
              {
                eventId: 'd26cff88-a061-494e-abb1-958216009585',
                triggers: ['FILTER_TRIGGER'],
                action: {
                  factoryId: 'DASHBOARD_TO_DASHBOARD_DRILLDOWN',
                  name: 'Go to Dashboard',
                  config: {
                    useCurrentFilters: true,
                    useCurrentDateRange: true,
                    openInNewTab: false,
                  },
                },
              },
            ],
          },
        },
      }),
    });
  }, [afterLoadedState, filters, chartAttributes]);

  return chartAttributes ? (
    <>
      <EuiButton
        data-test-subj="infraPortableMetricsAddVisualizationFromLibraryButton"
        // TODO: retrieve the saved dashboard so that we can reuse customizations made to it
        onClick={() => dashboard?.runSaveAs()}
        isDisabled={!dashboard}
      >
        {i18n.translate('xpack.infra.portableMetrics.addVisualizationFromLibraryButtonLabel', {
          defaultMessage: 'Add to library',
        })}
      </EuiButton>
      <DashboardRenderer getCreationOptions={getCreationOptions} ref={setDashboard} />
    </>
  ) : (
    <></>
  );
};

function convertSavedDashboardToPanels(
  chartAttributes: LensEmbeddableInput[] = []
): DashboardPanelMap {
  const panels = chartAttributes.reduce(
    (acc, panel, index) => {
      const panelState: DashboardPanelState = {
        type: 'lens',
        gridData: {
          h: 12,
          x: index % 2 ? 24 : 0,
          y: 0,
          w: 24,
          i: panel.id,
        },
        explicitInput: {
          ...panel,
          disabledActions: [
            'ACTION_CUSTOMIZE_PANEL',
            'openInspector',
            'togglePanel',
            'ACTION_OPEN_IN_DISCOVER',
            'ACTION_EXPORT_CSV',
            'embeddable_addToExistingCase',
            'embeddable_addToNewCase',
            'create-ml-ad-job-action',
          ],

          enhancements: {
            dynamicActions: {
              events: [
                {
                  eventId: 'd26cff88-a061-494e-abb1-958216009585',
                  triggers: ['FILTER_TRIGGER'],
                  action: {
                    factoryId: 'DASHBOARD_TO_DASHBOARD_DRILLDOWN',
                    name: 'Go to Dashboard',
                    config: {
                      useCurrentFilters: true,
                      useCurrentDateRange: true,
                      openInNewTab: false,
                    },
                  },
                },
              ],
            },
          },
        },
      };

      return { ...acc, [panel.id]: panelState };
    },

    {} as DashboardPanelMap
  );

  return panels;
}
