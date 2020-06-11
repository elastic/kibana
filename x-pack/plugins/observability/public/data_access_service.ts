/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup, Plugin, IContextContainer } from '../../../../src/core/public';
import { Setup, DataAccessHandlerProvider } from './typings/data_access_service';
import { DataFetcher } from './typings/data_fetcher';

export class ObservabilityDataAccessService implements Plugin<Setup, void> {
  private dataProviders = new Map<string, DataFetcher>();
  private contextContainer?: IContextContainer<DataAccessHandlerProvider>;

  public setup(core: CoreSetup): Setup {
    this.contextContainer = core.context.createContextContainer();

    const api: Setup = {
      registerProvider: ({ pluginOpaqueId, dataType, handler, providedContext }) => {
        if (!this.contextContainer) {
          throw new Error("Context container wasn't defined");
        }
        if (providedContext) {
          this.contextContainer!.registerContext(pluginOpaqueId, dataType, () => providedContext);
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
