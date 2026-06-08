/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Storybook annotations used by Jest only. Same provider chain as `preview.tsx`,
 * but the route tree is required lazily inside the decorator so each test file's
 * hoisted `jest.mock()` calls take effect before route components are evaluated.
 */
import React from 'react';
import type { Decorator } from '@storybook/react';
import * as jest from 'jest-mock';
import { MockApmPluginStorybook } from '../public/context/apm_plugin/mock_apm_plugin_storybook';

(window as any).jest = jest;

const ApmJestDecorator: Decorator = (Story, context) => {
  // Opt-out for stories that establish their own providers from `args` (e.g. tests that
  // render the same story with different inputs). Avoids nesting <Router> providers.
  if (context.parameters.skipApmJestDecorator) {
    return <Story />;
  }

  // Lazy require: `jest.mock()` calls in the test file are hoisted and registered before this
  // line runs, so any modules reachable from `apmRouter` resolve through those mocks.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { apmRouter } = require('../public/components/routing/apm_route_config');

  return (
    <MockApmPluginStorybook
      routePath={context.parameters.routePath}
      apmContext={context.parameters.apmContext}
      serviceContextValue={context.parameters.serviceContextValue}
      router={apmRouter}
    >
      <Story />
    </MockApmPluginStorybook>
  );
};

export const decorators = [ApmJestDecorator];
