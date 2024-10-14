/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import React from 'react';
import type { FunctionComponent } from 'react';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiAvatar, EuiText, EuiLink } from '@elastic/eui';
import { URL_DEMO_ENV } from '@kbn/home-sample-data-tab/src/constants';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import supportIconUrl from './support_icon.svg';
import demoIconUrl from './demo_icon.svg';
import docsIconUrl from './docs_icon.svg';
import forumIconUrl from './forum_icon.svg';
import { ObservabilityOnboardingAppServices } from '../..';

const URL_FORUM = 'https://discuss.elastic.co/';

export const Footer: FunctionComponent = () => {
  const {
    services: { docLinks, chrome },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const helpSupportUrl = useObservable(chrome.getHelpSupportUrl$());
  const sections = [
    {
      iconUrl: demoIconUrl,
      title: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.demoEnvironmentFlexItemLabel',
        { defaultMessage: 'Demo environment' }
      ),
      description: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.demoEnvironmentFlexItemDescription',
        {
          defaultMessage: 'Explore our live demo environment',
        }
      ),
      linkLabel: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.demoEnvironmentFlexItemLinkLabel',
        { defaultMessage: 'Explore demo' }
      ),
      link: URL_DEMO_ENV,
    },
    {
      iconUrl: forumIconUrl,
      title: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.exploreForumFlexItemLabel',
        { defaultMessage: 'Explore forum' }
      ),
      description: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.exploreForumFlexItemDescription',
        {
          defaultMessage: 'Exchange thoughts about Elastic',
        }
      ),
      linkLabel: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.exploreForumFlexItemLinkLabel',
        { defaultMessage: 'Discuss forum' }
      ),
      linkARIALabel: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.exploreForumFlexItemLinkARIALabel',
        { defaultMessage: 'Open Elastic Discuss forum' }
      ),
      link: URL_FORUM,
    },
    {
      iconUrl: docsIconUrl,
      title: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.browseDocumentationFlexItemLabel',
        { defaultMessage: 'Browse documentation' }
      ),
      description: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.browseDocumentationFlexItemDescription',
        {
          defaultMessage: 'In-depth guides on all Elastic features',
        }
      ),
      linkLabel: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.browseDocumentationFlexItemLinkLabel',
        { defaultMessage: 'Learn more' }
      ),
      linkARIALabel: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.browseDocumentationFlexItemLinkARIALabel',
        { defaultMessage: 'Learn more about all Elastic features' }
      ),
      link: docLinks.links.observability.guide,
    },
    {
      iconUrl: supportIconUrl,
      title: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.supportHubFlexItemLabel',
        { defaultMessage: 'Support Hub' }
      ),
      description: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.supportHubFlexItemDescription',
        {
          defaultMessage: 'Get help by opening a case',
        }
      ),
      linkLabel: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.supportHubFlexItemLinkLabel',
        { defaultMessage: 'Open Support Hub' }
      ),
      link: helpSupportUrl,
    },
  ];

  return (
    <EuiFlexGroup gutterSize="xl" justifyContent="center" alignItems="center">
      {sections.map((section, index) => (
        <EuiFlexItem key={index} grow={false}>
          <EuiAvatar size="l" name="" imageUrl={section.iconUrl} color="subdued" />
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
                aria-label={section.linkARIALabel}
                href={section.link}
                target="_blank"
                external
              >
                {section.linkLabel}
              </EuiLink>
            </p>
          </EuiText>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
