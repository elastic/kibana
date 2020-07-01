/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: this is very lossy typed
// not sure if we can improve this
// ActionContext or CollectConfigContext
type ExecutionContext = unknown;

export interface UrlDrilldownContextProvider<InjectedContext extends object = object> {
  injectedKeys: Array<keyof InjectedContext>;
  injectedKeysMeta?: Record<keyof InjectedContext, { description?: string; type?: string }>;
  injectContext(executionContext: ExecutionContext): InjectedContext | undefined;
}

export class UrlDrilldownContextProviderRegistry {
  private registry: UrlDrilldownContextProvider[] = [];
  private reservedKeys = new Set<string>();
  registerContextDefinition(provider: UrlDrilldownContextProvider) {
    const hasConflicts = provider.injectedKeys.some((key) => this.reservedKeys.has(key));
    if (hasConflicts) {
      throw new Error('Put better error message here');
    }

    this.registry.push(provider);
    provider.injectedKeys.forEach((key) => this.reservedKeys.add(key));
  }

  buildContextScope(context: ExecutionContext): object {
    return this.registry.reduce((res, provider) => {
      return {
        ...res,
        ...provider.injectContext(context),
      };
    }, {});
  }
}
