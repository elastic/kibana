/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { DecoratorFn } from '@storybook/react';
import { I18nProvider } from '@kbn/i18n/react';

import { PluginServiceRegistry } from '../../../../../src/plugins/presentation_util/public';
import { pluginServices, LegacyServicesProvider } from '../../public/services';
import { CanvasPluginServices } from '../../public/services';
import { pluginServiceProviders, StorybookParams } from '../../public/services/storybook';

export const servicesContextDecorator: DecoratorFn = (story: Function, storybook) => {
  if (process.env.JEST_WORKER_ID !== undefined) {
    storybook.args.useStaticData = true;
  }

  const pluginServiceRegistry = new PluginServiceRegistry<CanvasPluginServices, StorybookParams>(
    pluginServiceProviders
  );

  pluginServices.setRegistry(pluginServiceRegistry.start(storybook.args));

  const ContextProvider = pluginServices.getContextProvider();

  return (
    <I18nProvider>
      <ContextProvider>{story()}</ContextProvider>
    </I18nProvider>
  );
};

export const legacyContextDecorator = () => (story: Function) => (
  <LegacyServicesProvider>{story()}</LegacyServicesProvider>
);
