/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { EuiSpacer } from '@elastic/eui';
import { LandingLinksIconsCategories } from '@kbn/security-solution-navigation/landing_links';
import { SecurityPageName } from '../../common';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { SecuritySolutionPageWrapper } from '../common/components/page_wrapper';
import { SpyRoute } from '../common/utils/route/spy_routes';
import { Title } from '../common/components/header_page/title';
import { useRootNavLink } from '../common/links/nav_links';
import { useGlobalQueryString } from '../common/utils/global_query_string';
import { trackLandingLinkClick } from '../common/lib/telemetry/trackers';

const RULES_PAGE_TITLE = i18n.translate('xpack.securitySolution.rules.landing.pageTitle', {
  defaultMessage: 'Rules',
});

export const RulesLandingPage = () => {
  const { links = [], categories = [] } = useRootNavLink(SecurityPageName.rulesLanding) ?? {};
  const urlState = useGlobalQueryString();

  return (
    <PluginTemplateWrapper>
      <TrackApplicationView viewId={SecurityPageName.rulesLanding}>
        <SecuritySolutionPageWrapper>
          <Title title={RULES_PAGE_TITLE} />
          <EuiSpacer size="xl" />
          <LandingLinksIconsCategories
            links={links}
            categories={categories}
            onLinkClick={trackLandingLinkClick}
            urlState={urlState}
          />
          <SpyRoute pageName={SecurityPageName.rulesLanding} />
        </SecuritySolutionPageWrapper>
      </TrackApplicationView>
    </PluginTemplateWrapper>
  );
};
