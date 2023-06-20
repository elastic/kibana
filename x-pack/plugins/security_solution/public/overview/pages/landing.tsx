/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { Chat } from '@kbn/cloud-chat-plugin/public';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../../common/constants';
import { LandingPageComponent } from '../../common/components/landing_page';
import { useKibana } from '../../common/lib/kibana';
import { PluginTemplateWrapper } from '../../common/components/plugin_template_wrapper';

export const LandingPage = memo(() => {
  const { getStartedComponent$ } = useKibana().services;
  const GetStartedComponent = useObservable(getStartedComponent$);

  return (
    <>
      {GetStartedComponent ?? (
        <PluginTemplateWrapper>
          <LandingPageComponent />
        </PluginTemplateWrapper>
      )}
      <Chat />
      <SpyRoute pageName={SecurityPageName.landing} />
    </>
  );
});

LandingPage.displayName = 'LandingPage';
