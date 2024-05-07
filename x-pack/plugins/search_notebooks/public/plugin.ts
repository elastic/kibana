/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Plugin, CoreStart } from '@kbn/core/public';
import { QueryClient, MutationCache, QueryCache } from '@tanstack/react-query';

import { notebooksConsoleView } from './console_view';
import {
  SearchNotebooksPluginSetup,
  SearchNotebooksPluginStart,
  SearchNotebooksPluginStartDependencies,
} from './types';
import { getErrorCode, getErrorMessage, isKibanaServerError } from './utils/get_error_message';

export class SearchNotebooksPlugin
  implements Plugin<SearchNotebooksPluginSetup, SearchNotebooksPluginStart>
{
  private queryClient: QueryClient | undefined;
  public setup(core: CoreSetup): SearchNotebooksPluginSetup {
    this.queryClient = new QueryClient({
      mutationCache: new MutationCache({
        onError: (error) => {
          core.notifications.toasts.addError(error as Error, {
            title: (error as Error).name,
            toastMessage: getErrorMessage(error),
            toastLifeTimeMs: 1000,
          });
        },
      }),
      queryCache: new QueryCache({
        onError: (error) => {
          // 404s are often functionally okay and shouldn't show toasts by default
          if (getErrorCode(error) === 404) {
            return;
          }
          if (isKibanaServerError(error) && !error.skipToast) {
            core.notifications.toasts.addError(error, {
              title: error.name,
              toastMessage: getErrorMessage(error),
              toastLifeTimeMs: 1000,
            });
          }
        },
      }),
    });
    return {};
  }
  public start(
    core: CoreStart,
    deps: SearchNotebooksPluginStartDependencies
  ): SearchNotebooksPluginStart {
    if (deps.console?.registerEmbeddedConsoleAlternateView) {
      deps.console.registerEmbeddedConsoleAlternateView(
        notebooksConsoleView(core, this.queryClient!)
      );
    }
    return {};
  }
  public stop() {}
}
