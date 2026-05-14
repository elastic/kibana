/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ApmMainTemplate } from '../../routing/templates/apm_main_template';
import { Breadcrumb } from '../breadcrumb';
import { useApmParams } from '../../../hooks/use_apm_params';
import { OpenInDiscover } from '../../shared/links/discover_links/open_in_discover';
import { ApmIndexSettingsContextProvider } from '../../../context/apm_index_settings/apm_index_settings_context';

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

  const pageTitle = (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>{title}</EuiFlexItem>
      <EuiFlexItem grow={false}>
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
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <ApmIndexSettingsContextProvider>
      <Breadcrumb href="/traces" title={title} omitOnServerless>
        <ApmMainTemplate
          pageTitle={pageTitle}
          searchBar={searchBar}
          pageSectionProps={{
            contentProps: {
              style: {
                display: 'flex',
                flexGrow: 1,
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
