/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { SecurityPageName } from '../../common';
import { LandingLinksIconsCategoriesPage } from '../common/components/landing_links/landing_links_icons_categories';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';

const RULES_PAGE_TITLE = i18n.translate('xpack.securitySolution.rules.landing.pageTitle', {
  defaultMessage: 'Rules',
});

export const RulesLandingPage = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.rulesLanding}>
      <LandingLinksIconsCategoriesPage
        title={RULES_PAGE_TITLE}
        pageName={SecurityPageName.rulesLanding}
      />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);
