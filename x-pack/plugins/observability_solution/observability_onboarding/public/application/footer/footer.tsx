/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import React from 'react';
import type { FunctionComponent } from 'react';
import {
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiAvatar,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import integrationsIconUrl from './integrations_icon.svg';
import demoIconUrl from './demo_icon.svg';
import docsIconUrl from './docs_icon.svg';
import forumIconUrl from './forum_icon.svg';

export const Footer: FunctionComponent = () => {
  const sections = [
    {
      iconUrl: integrationsIconUrl,
      title: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.dataSourcesFlexItemLabel',
        { defaultMessage: 'Data sources' }
      ),
      description:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod',
    },
    {
      iconUrl: demoIconUrl,
      title: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.demoEnvironmentFlexItemLabel',
        { defaultMessage: 'Demo environment' }
      ),
      description:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod',
    },
    {
      iconUrl: docsIconUrl,
      title: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.exploreForumFlexItemLabel',
        { defaultMessage: 'Explore forum' }
      ),
      description:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod',
    },
    {
      iconUrl: forumIconUrl,
      title: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.browseDocumentationFlexItemLabel',
        { defaultMessage: 'Browse documentation' }
      ),
      description:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod',
    },
  ];

  return (
    <EuiFlexGroup>
      {sections.map((section, index) => (
        <EuiFlexItem key={index}>
          <EuiAvatar
            size="l"
            name=""
            imageUrl={section.iconUrl}
            color="subdued"
          />
          <EuiSpacer size="m" />
          <EuiText size="s">
            <strong>{section.title}</strong>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiText size="xs">
            <p>{section.description}</p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiText size="xs">
            <p>
              <EuiLink
                data-test-subj="observabilityOnboardingFooterLearnMoreLink"
                href="#/navigation/link"
                external
              >
                {i18n.translate(
                  'xpack.observability_onboarding.footer.learnMoreLinkLabel',
                  { defaultMessage: 'Learn more' }
                )}
              </EuiLink>
            </p>
          </EuiText>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
