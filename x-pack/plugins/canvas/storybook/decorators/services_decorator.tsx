/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { DecoratorFn } from '@storybook/react';
import { I18nProvider } from '@kbn/i18n-react';

import { PluginServiceRegistry } from '@kbn/presentation-util-plugin/public';
import { pluginServices, CanvasPluginServices } from '../../public/services';
import { pluginServiceProviders, StorybookParams } from '../../public/services/storybook';
import { LegacyServicesProvider } from '../../public/services/legacy';
import { startServices } from '../../public/services/legacy/stubs';

export const servicesContextDecorator = (): DecoratorFn => {
  const pluginServiceRegistry = new PluginServiceRegistry<CanvasPluginServices, StorybookParams>(
    pluginServiceProviders
  );

  pluginServices.setRegistry(pluginServiceRegistry.start({}));

  return (story: Function, storybook) => {
    if (process.env.JEST_WORKER_ID !== undefined) {
      storybook.args.useStaticData = true;
    }

    pluginServices.setRegistry(pluginServiceRegistry.start(storybook.args));
    const ContextProvider = pluginServices.getContextProvider();

    return (
      <I18nProvider>
        <ContextProvider>{story()}</ContextProvider>
      </I18nProvider>
    );
  };
};

export const legacyContextDecorator = () => {
  startServices();
  return (story: Function) => <LegacyServicesProvider>{story()}</LegacyServicesProvider>;
};
