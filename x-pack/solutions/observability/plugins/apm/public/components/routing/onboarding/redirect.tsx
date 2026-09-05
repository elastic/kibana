/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

export function TutorialRedirect() {
  const { search } = useLocation();
  const {
    config: { serverlessOnboarding },
    core: {
      application: { navigateToApp },
    },
  } = useApmPluginContext();

  if (serverlessOnboarding) {
    navigateToApp('apm', {
      path: '/onboarding',
      replace: true,
    });
  } else {
    navigateToApp('home', {
      path: `#/tutorial/apm${search}`,
      replace: true,
    });
  }
  return <></>;
}

export const tutorialRedirectRoute = {
  '/tutorial': {
    element: <TutorialRedirect />,
  },
};
