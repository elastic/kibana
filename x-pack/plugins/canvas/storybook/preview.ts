/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addParameters } from '@storybook/react';
import { addDecorators } from './decorators';

// Import Canvas CSS
import '../public/style/index.scss';

import { PluginServiceRegistry } from '../../../../src/plugins/presentation_util/public';
import { pluginServices } from '../public/services';
import { CanvasPluginServices } from '../public/services';
import { pluginServiceProviders, StorybookParams } from '../public/services/storybook';

const pluginServiceRegistry = new PluginServiceRegistry<CanvasPluginServices, StorybookParams>(
  pluginServiceProviders
);

pluginServices.setRegistry(pluginServiceRegistry.start({}));

addDecorators();
addParameters({
  controls: { hideNoControlsWarning: true },
});
