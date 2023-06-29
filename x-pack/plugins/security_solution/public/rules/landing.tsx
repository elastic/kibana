/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { SecurityPageName } from '../../common';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { SecuritySolutionPageWrapper } from '../common/components/page_wrapper';
import { SpyRoute } from '../common/utils/route/spy_routes';
import { LandingLinksIconsCategories } from '../common/components/landing_links/landing_links_icons_categories';
import { Title } from '../common/components/header_page/title';
import { SecuritySolutionLinkButton } from '../common/components/links';

const RULES_PAGE_TITLE = i18n.translate('xpack.securitySolution.rules.landing.pageTitle', {
  defaultMessage: 'Rules',
});

const CREATE_RULE_BUTTON = i18n.translate('xpack.securitySolution.rules.landing.createRule', {
  defaultMessage: 'Create rule',
});

const RulesLandingHeader: React.FC = () => (
  <EuiFlexGroup gutterSize="none" direction="row">
    <EuiFlexItem>
      <Title title={RULES_PAGE_TITLE} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <SecuritySolutionLinkButton deepLinkId={SecurityPageName.rulesCreate} iconType="plusInCircle">
        {CREATE_RULE_BUTTON}
      </SecuritySolutionLinkButton>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const RulesLandingPage = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.rulesLanding}>
      <SecuritySolutionPageWrapper>
        <RulesLandingHeader />
        <EuiSpacer size="xl" />
        <LandingLinksIconsCategories pageName={SecurityPageName.rulesLanding} />
        <SpyRoute pageName={SecurityPageName.rulesLanding} />
      </SecuritySolutionPageWrapper>
    </TrackApplicationView>
  </PluginTemplateWrapper>
);
