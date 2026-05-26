/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ApmMainTemplate } from '../../routing/templates/apm_main_template';
import { Breadcrumb } from '../breadcrumb';
import { useApmParams } from '../../../hooks/use_apm_params';
import { OpenInDiscover } from '../../shared/links/discover_links/open_in_discover';
import { ApmIndexSettingsContextProvider } from '../../../context/apm_index_settings/apm_index_settings_context';
import { APM_EBT_ACTIONS } from '../ebt_constants';
import { TRACE_OVERVIEW_EBT_ELEMENTS } from './ebt_constants';

export function TraceOverview({
  children,
  searchBar,
}: {
  children: React.ReactElement;
  searchBar?: React.ReactNode;
}) {
  const title = i18n.translate('xpack.apm.views.traceOverview.title', {
    defaultMessage: 'Traces',
  });

  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/traces');

  const { euiTheme } = useEuiTheme();
  // Visually align `EuiButtonEmpty` with the larger page title baseline.
  // `display: inline-flex` prevents the inline wrapper from adding extra
  // line-height-driven height around the button.
  const exploreTracesButtonCss = css({
    display: 'inline-flex',
    marginTop: euiTheme.size.xs,
  });

  return (
    <ApmIndexSettingsContextProvider>
      <Breadcrumb href="/traces" title={title} omitOnServerless>
        <ApmMainTemplate
          pageTitle={title}
          searchBar={searchBar}
          pageHeader={{
            rightSideItems: [
              <span key="apmTracesExploreInDiscoverButton" css={exploreTracesButtonCss}>
                <OpenInDiscover
                  dataTestSubj="apmTracesExploreInDiscoverButton"
                  variant="emptyButton"
                  indexType="traces"
                  label={i18n.translate('xpack.apm.tracesOverview.exploreTracesInDiscover', {
                    defaultMessage: 'Explore traces',
                  })}
                  rangeFrom={rangeFrom}
                  rangeTo={rangeTo}
                  queryParams={{ kuery, environment, sortDirection: 'DESC' }}
                  ebt={{
                    action: APM_EBT_ACTIONS.EXPLORE_TRACES,
                    element: TRACE_OVERVIEW_EBT_ELEMENTS.PAGE_HEADER,
                  }}
                />
              </span>,
            ],
          }}
          pageSectionProps={{
            contentProps: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1,
                minInlineSize: 0,
              },
            },
          }}
        >
          {children}
        </ApmMainTemplate>
      </Breadcrumb>
    </ApmIndexSettingsContextProvider>
  );
}
