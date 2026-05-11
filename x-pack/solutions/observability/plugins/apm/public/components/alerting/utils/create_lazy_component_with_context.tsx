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

/**
 * Setup-time deps captured by the APM plugin and threaded into rule-type lazy components
 * so that downstream sections (e.g. the alert details service map preview) can render APM
 * embeddables inside their own `ApmEmbeddableContext` without going through the global
 * embeddable registry (which is registered asynchronously and would otherwise race the
 * alert details page render).
 */
export type ApmAlertingSetupDeps = Omit<EmbeddableDeps, 'coreStart' | 'pluginsStart'>;

/**
 * Wraps a lazy-loaded component with a `KibanaContextProvider` that resolves APM's own
 * start services, and additionally exposes a fully-resolved `EmbeddableDeps` value via
 * `ApmEmbeddableDepsContext`. This is necessary for APM components that are rendered
 * outside APM's app context (e.g. alert detail sections rendered by the observability
 * plugin) so that:
 *  - `useKibana()` resolves APM's deps (like `apmSourcesAccess`) instead of the host
 *    plugin's deps,
 *  - APM embeddables can be rendered directly (without depending on the async
 *    `registerEmbeddables` registry) by reading deps from context.
 *
 * This mirrors the pattern used by the infra plugin
 * (see `infra/public/hooks/use_kibana.tsx → createLazyComponentWithKibanaContext`).
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
