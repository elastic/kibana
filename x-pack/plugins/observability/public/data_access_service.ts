/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup, Plugin, IContextContainer } from '../../../../src/core/public';
import { Setup, DataAccessHandlerProvider } from './typings/data_access_service';
import { ChartDataFetcher } from '../typings/chart';

export class ObservabilityDataAccessService implements Plugin<Setup, void> {
  private dataProviders = new Map<string, ChartDataFetcher>();
  private contextContainer?: IContextContainer<DataAccessHandlerProvider>;

  public setup(core: CoreSetup): Setup {
    this.contextContainer = core.context.createContextContainer();

    const api: Setup = {
      registerProvider: (pluginOpaqueId, dataType, handler) => {
        if (!this.contextContainer) {
          throw new Error("Context container wasn't defined");
        }
        this.dataProviders.set(
          dataType,
          this.contextContainer.createHandler(pluginOpaqueId, handler)
        );
      },
      registerContext: this.contextContainer!.registerContext,
    };

    return api;
  }

  public getDataProvider(dataType: string) {
    return this.dataProviders.get(dataType);
  }

  public start() {}
  public stop() {}
}
