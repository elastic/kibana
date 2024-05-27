/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React from 'react';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { css } from '@emotion/react';
import { FilterBar } from './components/filter_bar';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { LayoutView } from './components/layout_view';
import { MetricsPageTemplate } from '../page_template';
import { inventoryTitle } from '../../../translations';
import { SavedViews } from './components/saved_views';
import { SnapshotContainer } from './components/snapshot_container';
import { fullHeightContentStyles } from '../../../page_template.styles';
import { SurveySection } from './components/survey_section';
import { WaffleOptionsProvider } from './hooks/use_waffle_options';
import { WaffleTimeProvider } from './hooks/use_waffle_time';
import { WaffleFiltersProvider } from './hooks/use_waffle_filters';

export const SnapshotPage = () => {
  useTrackPageview({ app: 'infra_metrics', path: 'inventory' });
  useTrackPageview({ app: 'infra_metrics', path: 'inventory', delay: 15000 });

  useMetricsBreadcrumbs([
    {
      text: inventoryTitle,
    },
  ]);

  return (
    <EuiErrorBoundary>
      <WaffleOptionsProvider>
        <WaffleTimeProvider>
          <WaffleFiltersProvider>
            <div className={APP_WRAPPER_CLASS}>
              <MetricsPageTemplate
                pageHeader={{
                  pageTitle: inventoryTitle,
                  rightSideItems: [<SavedViews />, <SurveySection />],
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
                  render={({ loading, nodes, reload, interval }) => (
                    <>
                      <FilterBar interval={interval} />
                      <LayoutView
                        loading={loading}
                        nodes={nodes}
                        reload={reload}
                        interval={interval}
                      />
                    </>
                  )}
                />
              </MetricsPageTemplate>
            </div>
          </WaffleFiltersProvider>
        </WaffleTimeProvider>
      </WaffleOptionsProvider>
    </EuiErrorBoundary>
  );
};
