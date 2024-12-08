/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Routes, Route } from '@kbn/shared-ux-router';
import { EuiSpacer, useEuiTheme } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { Redirect } from 'react-router-dom';
import { ONBOARDING_PATH } from '../../../common/constants';
import { PluginTemplateWrapper } from '../../common/components/plugin_template_wrapper';
import { CenteredLoadingSpinner } from '../../common/components/centered_loading_spinner';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { OnboardingTopicId, PAGE_CONTENT_WIDTH } from '../constants';
import { OnboardingContextProvider } from './onboarding_context';
import { OnboardingAVCBanner } from './onboarding_banner';
import { OnboardingRoute } from './onboarding_route';
import { OnboardingFooter } from './onboarding_footer';
import type { StartPlugins } from '../../types';

const topicPathParam = `:topicId(${Object.values(OnboardingTopicId) // any topics
  .filter((val) => val !== OnboardingTopicId.default) // except "default"
  .join('|')})?`; // optional parameter

export const OnboardingPage = React.memo((plugins: StartPlugins) => {
  const spaceId = useSpaceId();
  const { euiTheme } = useEuiTheme();

  if (!spaceId) {
    return (
      <PluginTemplateWrapper>
        <CenteredLoadingSpinner size="l" topOffset="10em" />
      </PluginTemplateWrapper>
    );
  }

  return (
    <OnboardingContextProvider spaceId={spaceId} fleet={plugins.fleet}>
      <PluginTemplateWrapper paddingSize="none" data-test-subj="onboarding-hub-page">
        <OnboardingAVCBanner />
        <KibanaPageTemplate.Section
          grow={true}
          restrictWidth={PAGE_CONTENT_WIDTH}
          paddingSize="xl"
          bottomBorder="extended"
          style={{ backgroundColor: euiTheme.colors.body }}
        >
          <Routes>
            <Route
              path={`${ONBOARDING_PATH}/${topicPathParam}`}
              exact
              component={OnboardingRoute}
            />
            <Route path={`${ONBOARDING_PATH}/*`} render={() => <Redirect to={ONBOARDING_PATH} />} />
          </Routes>
        </KibanaPageTemplate.Section>
        <EuiSpacer size="l" />
        <KibanaPageTemplate.Section grow={true} restrictWidth={PAGE_CONTENT_WIDTH} paddingSize="xl">
          <OnboardingFooter />
        </KibanaPageTemplate.Section>
      </PluginTemplateWrapper>
    </OnboardingContextProvider>
  );
});
OnboardingPage.displayName = 'OnboardingPage';
