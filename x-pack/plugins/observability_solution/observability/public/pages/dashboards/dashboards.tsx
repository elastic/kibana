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
  EuiTitle,
  EuiLink,
} from '@elastic/eui';
import { DashboardAttributes } from '@kbn/dashboard-plugin/common';
import { Reference } from '@kbn/content-management-utils';
import { GetDashboardsSectionsResponse } from '../../../common/dashboards';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';
import { useKibana } from '../../utils/kibana_react';

// Copied from Dashboard app
interface FoundDashboard {
  id: string;
  status: 'success';
  attributes: DashboardAttributes;
  references: Reference[];
}

interface ResolvedSection {
  title: string;
  dashboards: Array<DashboardAttributes & { id: string }>;
}

export function DashboardsPage() {
  const [isSectionsLoading, setIsSectionsLoading] = useState(true);
  const [sections, setSections] = useState<ResolvedSection[]>([]);
  const [searchValue, setSearchValue] = useState('');

  const { ObservabilityPageTemplate } = usePluginContext();

  const {
    services: { http, dashboard: dashboardStart },
  } = useKibana();

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.dashboardsPage.breadcrumbs.dashboardsLinkText', {
        defaultMessage: 'Dashboards',
      }),
    },
  ]);

  useEffect(() => {
    async function fetchSections() {
      const response = await http.get<GetDashboardsSectionsResponse>(
        '/api/observability/dashboards/sections'
      );

      const findDashboardsService = await dashboardStart.findDashboardsService();
      const resolvedSections: ResolvedSection[] = [];
      for (const section of response.sections) {
        const dashboardIds = section.dashboards.map((dashboard) => dashboard.id);
        const results = await findDashboardsService.findByIds(dashboardIds);
        const dashboards = results
          .filter((result): result is FoundDashboard => result.status === 'success')
          .map((result) => ({
            ...result.attributes,
            id: result.id,
          }));
        resolvedSections.push({
          title: section.title,
          dashboards,
        });
      }

      setSections(resolvedSections);
      setIsSectionsLoading(false);
    }

    fetchSections();
  }, [dashboardStart, http]);

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
                  {i18n.translate('xpack.observability.dashboardsPage.loadingIndicatorLabel', {
                    defaultMessage: 'Loading dashboards',
                  })}
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          />
        ) : (
          <>
            <EuiPageHeader
              pageTitle={i18n.translate('xpack.observability.dashboardsPage.pageHeaderLabel', {
                defaultMessage: 'Dashboards',
              })}
              rightSideItems={[
                <EuiFieldSearch
                  data-test-subj="o11yDashboardsPageFieldSearch"
                  placeholder="Find a dashboard"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  isClearable={true}
                />,
                // Add button to "Add section" and move the search to below the header so it can apply to all sections
                // Each section could be a list of dashboards from that "section" using DashboardListingTable
                // Not sure I can use that component though since I'll need to inject things into it, not just find by tags
              ]}
            />
            <EuiSpacer />
            <EuiFlexGroup direction="column">
              {sections.map((section) => (
                <EuiFlexItem key={section.title} grow={false} css={{ minWidth: '200px' }}>
                  {/* Would be great to use the Integration icon here and maybe have some good descriptive text */}
                  <>
                    <EuiTitle size="xs">
                      <h2>{section.title}</h2>
                    </EuiTitle>
                    <EuiHorizontalRule />
                    {section.dashboards.map((dashboard) => (
                      <EuiLink
                        data-test-subj="o11yDashboardsPageLink"
                        href={dashboardStart.locator?.getRedirectUrl({
                          dashboardId: dashboard.id,
                        })}
                      >
                        {dashboard.title}
                      </EuiLink>
                    ))}
                  </>
                  {/* Each section should then have a tile for each Dashboard, and a placeholder tile with a big plus sign to add a new dashboard to that section */}
                  {/* How do I get images for the custom ones? And a description for all of them? */}
                  {/* Also, can I get the Dashboard app to return me to this page once a Dashboard has been created and saved? */}
                  {/* Security creates the dashboard in the same page */}
                  {/* Should I have two big sections, one for all the Integration dashboards and one for anything custom made? */}
                  {/* That would be more similar to what Security does, but might make it a little harder to find, specially as you hook new dashboards into existing sections */}
                  {/* On the other hand, having multiple small tables is really noisy. So, tiles? */}
                  {/* OR table but we add a filter for tags, per Integration, users can be directed to add this tag as well on custom things */}
                  {/* Together with a tag for the Obs Solution for all the custom section things? */}
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        )}
      </ObservabilityPageTemplate>
    </EuiErrorBoundary>
  );
}
