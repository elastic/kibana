/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import React, { useEffect, useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiErrorBoundary,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageHeader,
  EuiSpacer,
  EuiHorizontalRule,
  EuiText,
} from '@elastic/eui';
import { Section } from '../../../common/dashboards';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';
import { useKibana } from '../../utils/kibana_react';

export function DashboardsPage() {
  const [isSectionsLoading, setIsSectionsLoading] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [searchValue, setSearchValue] = useState('');

  const { ObservabilityPageTemplate } = usePluginContext();

  const {
    services: { http },
  } = useKibana();

  useBreadcrumbs([
    {
      text: i18n.translate(
        'xpack.observability.dashboardsPage.breadcrumbs.dashboardsLinkText',
        {
          defaultMessage: 'Dashboards',
        }
      ),
    },
  ]);

  useEffect(() => {
    async function fetchSections() {
      const response = await http.get<{ sections: Section[] }>(
        '/api/observability/dashboards/sections'
      );
      setSections(response.sections);
      setIsSectionsLoading(false);
    }

    fetchSections();
  }, [http]);

  return (
    <EuiErrorBoundary>
      <ObservabilityPageTemplate
        pageSectionProps={{ alignment: isSectionsLoading ? 'center' : 'top' }}
      >
        <HeaderMenu />
        {isSectionsLoading ? (
          <EuiEmptyPrompt
            body={
              <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="none">
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="xl" style={{ marginRight: '8px' }} />
                </EuiFlexItem>
                <EuiFlexItem>
                  {i18n.translate(
                    'xpack.observability.dashboardsPage.loadingIndicatorLabel',
                    {
                      defaultMessage: 'Loading dashboards',
                    }
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          />
        ) : (
          <>
            <EuiPageHeader
              pageTitle={i18n.translate(
                'xpack.observability.dashboardsPage.pageHeaderLabel',
                {
                  defaultMessage: 'Dashboards',
                }
              )}
              iconType="dashboardApp"
              rightSideItems={[
                <EuiFieldSearch
                  data-test-subj="o11yDashboardsPageFieldSearch"
                  placeholder="Find a dashboard"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  isClearable={true}
                />,
                // Add button to "Add section"
              ]}
            />
            <EuiSpacer />
            <EuiFlexGroup direction='column'>
              {sections
                .map((section) => (
                  <EuiFlexItem key={section.title} grow={false} css={{ minWidth: '200px' }}>
                    {/* Would be great to use the Integration icon here and maybe have some good descriptive text */}
                    <>
                      <EuiText size='xs'>
                        <h2>{section.title}</h2>
                      </EuiText>
                      <EuiHorizontalRule />
                    </>
                    {/* Each section should then have a tile for each Dashboard, and a placeholder tile with a big plus sign to add a new dashboard to that section */}
                    {/* How do I get images for the custom ones? And a description for all of them? */}
                    {/* Also, can I get the Dashboard app to return me to this page once a Dashboard has been created and saved? */}
                    {/* Security creates the dashboard in the same page */}
                  </EuiFlexItem>
                ))}
            </EuiFlexGroup>
          </>
        )}
      </ObservabilityPageTemplate>
    </EuiErrorBoundary>
  );
}
