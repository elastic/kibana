/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsOf } from '@elastic/eui';
import type { CoreSetup } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { ApmPluginStart, ApmPluginStartDeps } from '../../../plugin';
import type { EmbeddableDeps } from '../../../embeddable/types';
import { ApmEmbeddableDepsContext } from '../context/apm_embeddable_deps_context';

export type ApmCoreSetup = CoreSetup<ApmPluginStartDeps, ApmPluginStart>;

/** Setup-time deps captured by APM and threaded into rule-type lazy components. */
export type ApmAlertingSetupDeps = Omit<EmbeddableDeps, 'coreStart' | 'pluginsStart'>;

/**
 * Wraps a lazy-loaded APM component with APM's `KibanaContextProvider` and exposes
 * `EmbeddableDeps` via `ApmEmbeddableDepsContext`. Mirrors infra's
 * `createLazyComponentWithKibanaContext`.
 */
export const createLazyApmComponentWithContext = <T extends React.ComponentType<any>>(
  coreSetup: ApmCoreSetup,
  lazyComponentFactory: () => Promise<{ default: T }>,
  setupDeps?: ApmAlertingSetupDeps
) =>
  React.lazy(() =>
    Promise.all([lazyComponentFactory(), coreSetup.getStartServices()]).then(
      ([{ default: LazilyLoadedComponent }, [core, plugins, pluginStart]]) => {
        const embeddableDeps: EmbeddableDeps | undefined = setupDeps
          ? {
              ...setupDeps,
              coreStart: core,
              pluginsStart: plugins,
            }
          : undefined;

        return {
          default: (props: PropsOf<T>) => (
            <KibanaContextProvider
              services={{
                ...core,
                ...plugins,
                ...(pluginStart ?? {}),
              }}
            >
              <ApmEmbeddableDepsContext.Provider value={embeddableDeps ?? null}>
                <LazilyLoadedComponent {...props} />
              </ApmEmbeddableDepsContext.Provider>
            </KibanaContextProvider>
          ),
        };
      }
    )
  );
