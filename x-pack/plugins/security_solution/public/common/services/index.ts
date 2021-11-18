/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KibanaPluginServiceParams,
  PluginServiceProvider,
  PluginServiceProviders,
  PluginServiceRegistry,
  PluginServices,
} from '../../../../../../src/plugins/presentation_util/public';
import { TemplateFindResponse } from '../../../common/types/matrix_histogram_templates';
import { StartPlugins } from '../../types';
import { matrixHistogramTemplatesServiceFactory } from './matrix_histogram_templates';

export interface SecuritySolutionMatrixHistogramService {
  findTemplates: () => Promise<TemplateFindResponse>;
}

export interface SecuritySolutionPluginServices {
  matrixHistogramTemplates: SecuritySolutionMatrixHistogramService;
}

export const pluginServices = new PluginServices<SecuritySolutionPluginServices>();

export const useMatrixHistogramTemplatesService = () =>
  (() => pluginServices.getHooks().matrixHistogramTemplates.useService())();

export const pluginServiceProviders: PluginServiceProviders<
  SecuritySolutionPluginServices,
  KibanaPluginServiceParams<StartPlugins>
> = {
  matrixHistogramTemplates: new PluginServiceProvider(matrixHistogramTemplatesServiceFactory),
};

export const pluginServiceRegistry = new PluginServiceRegistry<
  SecuritySolutionPluginServices,
  KibanaPluginServiceParams<StartPlugins>
>(pluginServiceProviders);
