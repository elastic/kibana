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

export type ApmCoreSetup = CoreSetup<ApmPluginStartDeps, ApmPluginStart>;

/**
 * Wraps a lazy-loaded component with a KibanaContextProvider that resolves
 * APM's own start services. This is necessary for APM components that are
 * rendered outside APM's app context (e.g. alert detail sections rendered
 * by the observability plugin) so that useKibana() resolves APM's deps
 * (like apmSourcesAccess) instead of the host plugin's deps.
 *
 * This follows the same pattern used by the infra plugin
 * (see infra/public/hooks/use_kibana.tsx → createLazyComponentWithKibanaContext).
 */
export const createLazyApmComponentWithContext = <T extends React.ComponentType<any>>(
  coreSetup: ApmCoreSetup,
  lazyComponentFactory: () => Promise<{ default: T }>
) =>
  React.lazy(() =>
    Promise.all([lazyComponentFactory(), coreSetup.getStartServices()]).then(
      ([{ default: LazilyLoadedComponent }, [core, plugins, pluginStart]]) => ({
        default: (props: PropsOf<T>) => (
          <KibanaContextProvider
            services={{
              ...core,
              ...plugins,
              ...(pluginStart ?? {}),
            }}
          >
            <LazilyLoadedComponent {...props} />
          </KibanaContextProvider>
        ),
      })
    )
  );
