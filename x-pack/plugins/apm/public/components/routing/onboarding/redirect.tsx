/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

function TutorialRedirect() {
  const {
    config: { serverlessOnboarding },
    core: {
      application: { navigateToUrl },
      http: { basePath },
    },
  } = useApmPluginContext();

  if (serverlessOnboarding) {
    navigateToUrl(basePath.prepend('/app/apm/onboarding'));
  } else {
    navigateToUrl(basePath.prepend('/app/home#/tutorial/apm'));
  }
  return <></>;
}

export const tutorialRedirectRoute = {
  '/tutorial': {
    element: <TutorialRedirect />,
  },
};
