/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup, Plugin, IContextContainer } from '../../../../src/core/public';
import { ChartDataFetcher } from '../typings/chart';

export interface Setup {
  registerProvider: (opaqueId: symbol, name: string, handler: ChartDataFetcher) => void;
}

export class ObservabilityService implements Plugin<Setup, void> {
  private handlers = new Map<string, ChartDataFetcher>();
  private contextContainer?: IContextContainer<ChartDataFetcher>;

  public setup(core: CoreSetup): Setup {
    this.contextContainer = core.context.createContextContainer();

    const api: Setup = {
      registerProvider: (pluginOpaqueId, path, handler) => {
        if (!this.contextContainer) {
          throw new Error("Context container wasn't defined");
        }
        this.handlers.set(path, this.contextContainer.createHandler(pluginOpaqueId, handler));
      },
    };

    return api;
  }

  public getHandlers() {
    return this.handlers;
  }

  public start() {}
  public stop() {}
}
