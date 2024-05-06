/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LandingLinksIcons } from '@kbn/security-solution-navigation/landing_links';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { useRootNavLink } from '../common/links/nav_links';

export const Investigations: React.FC = () => {
  const link = useRootNavLink(SecurityPageName.investigations);
  const { links = [], title } = link ?? {};

  return (
    <KibanaPageTemplate restrictWidth={false} contentBorder={false} grow={true}>
      <KibanaPageTemplate.Section>
        <EuiPageHeader pageTitle={title} />
        <EuiSpacer size="l" />
        <EuiSpacer size="xl" />
        <LandingLinksIcons items={links} />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
