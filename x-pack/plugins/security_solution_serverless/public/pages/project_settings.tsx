/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import {
  LandingLinksIcons,
  LandingLinksIconsCategoriesGroups,
} from '@kbn/security-solution-navigation/landing_links';
import type { AccordionLinkCategory } from '@kbn/security-solution-navigation';
import {
  isAccordionLinkCategory,
  isSeparatorLinkCategory,
  SecurityPageName,
} from '@kbn/security-solution-navigation';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useNavLink } from '../common/hooks/use_nav_links';

export const ProjectSettingsRoute: React.FC = () => {
  const projectSettingsLink = useNavLink(SecurityPageName.projectSettings);
  const { links = [], categories = [], title } = projectSettingsLink ?? {};

  const iconLinkIds =
    categories.find((category) => isSeparatorLinkCategory(category))?.linkIds ?? [];
  const iconLinks = links.filter(({ id }) => iconLinkIds.includes(id));

  const accordionCategories = (categories.filter((category) => isAccordionLinkCategory(category)) ??
    []) as AccordionLinkCategory[];

  return (
    <KibanaPageTemplate restrictWidth={false} contentBorder={false} grow={true}>
      <KibanaPageTemplate.Section>
        <EuiPageHeader pageTitle={title} />
        <EuiSpacer size="l" />
        <EuiSpacer size="xl" />
        <LandingLinksIcons items={iconLinks} />
        <EuiSpacer size="l" />
        <EuiHorizontalRule />
        <LandingLinksIconsCategoriesGroups links={links} categories={accordionCategories} />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};

// eslint-disable-next-line import/no-default-export
export default ProjectSettingsRoute;
