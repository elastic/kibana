/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { LandingLinksIconsCategories } from '@kbn/landing-pages';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { useRootNavLink } from '@kbn/security-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

// MachineLearningLandingPage
export const LandingPage: React.FC = () => {
  // useKibana -> get chrome
  // const { chrome } = useKibana().services;
  // chrome.
  // extract the generation on links and pass it to the generic component
  // const link = useRootNavLink(SecurityPageName.mlLanding); // TODO check why it breaks the page
  const link = {
    links: [],
    categories: [],
    title: 'Test',
  };
  const { links = [], categories = [], title } = link ?? {};

  return (
    <KibanaPageTemplate restrictWidth={false} contentBorder={false} grow={true}>
      <KibanaPageTemplate.Section>
        <EuiPageHeader pageTitle={title} />
        <EuiSpacer size="l" />
        <EuiSpacer size="xl" />
        <LandingLinksIconsCategories links={links} categories={categories} />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
