import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LandingLinksIconsCategories } from '@kbn/security-solution-navigation/landing_links';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { SecurityPageName } from '../../common';
import { Title } from '../common/components/header_page/title';
import { SecuritySolutionPageWrapper } from '../common/components/page_wrapper';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { trackLandingLinkClick } from '../common/lib/telemetry/trackers';
import { useRootNavLink } from '../common/links/nav_links';
import { useGlobalQueryString } from '../common/utils/global_query_string';
import { SpyRoute } from '../common/utils/route/spy_routes';

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
