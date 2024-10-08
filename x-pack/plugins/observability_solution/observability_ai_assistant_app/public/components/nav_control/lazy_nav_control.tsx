/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dynamic } from '@kbn/shared-ux-utility';
import React from 'react';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { useIsNavControlVisible } from '../../hooks/is_nav_control_visible';
import { ObservabilityAIAssistantAppService } from '../../service/create_app_service';
import { ObservabilityAIAssistantAppPluginStartDependencies } from '../../types';

const LazyNavControlWithProvider = dynamic(() =>
  import('.').then((m) => ({ default: m.NavControlWithProvider }))
);

interface NavControlInitiatorProps {
  appService: ObservabilityAIAssistantAppService;
  coreStart: CoreStart;
  pluginsStart: ObservabilityAIAssistantAppPluginStartDependencies;
}

export const NavControlInitiator = ({
  appService,
  coreStart,
  pluginsStart,
}: NavControlInitiatorProps) => {
  const { isVisible } = useIsNavControlVisible({ coreStart, pluginsStart });

  if (!isVisible) {
    return null;
  }

  return (
    <LazyNavControlWithProvider
      appService={appService}
      coreStart={coreStart}
      pluginsStart={pluginsStart}
    />
  );
};
