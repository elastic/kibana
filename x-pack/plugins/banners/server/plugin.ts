/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Plugin, PluginInitializerContext } from 'src/core/server';
import { BannerConfiguration } from '../common';
import { BannersConfigType } from './config';
import { BannersRequestHandlerContext } from './types';
import { registerRoutes } from './routes';

export class BannersPlugin implements Plugin<{}, {}, {}, {}> {
  private readonly config: BannerConfiguration;

  constructor(context: PluginInitializerContext) {
    this.config = convertConfig(context.config.get<BannersConfigType>());
  }

  setup({ uiSettings, getStartServices, http }: CoreSetup<{}, {}>) {
    const router = http.createRouter<BannersRequestHandlerContext>();
    registerRoutes(router, this.config);

    return {};
  }

  start() {
    return {};
  }
}

const convertConfig = (raw: BannersConfigType): BannerConfiguration => raw;
