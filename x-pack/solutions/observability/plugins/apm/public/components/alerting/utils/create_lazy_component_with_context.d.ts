import React from 'react';
import type { PropsOf } from '@elastic/eui';
import type { CoreSetup } from '@kbn/core/public';
import type { ApmPluginStart, ApmPluginStartDeps } from '../../../plugin';
import type { EmbeddableDeps } from '../../../embeddable/types';
export type ApmCoreSetup = CoreSetup<ApmPluginStartDeps, ApmPluginStart>;
/** Setup-time deps captured by APM and threaded into rule-type lazy components. */
export type ApmAlertingSetupDeps = Omit<EmbeddableDeps, 'coreStart' | 'pluginsStart'>;
/**
 * Wraps a lazy-loaded APM component with APM's `KibanaContextProvider` and exposes
 * `EmbeddableDeps` via `ApmEmbeddableDepsContext`. Mirrors infra's
 * `createLazyComponentWithKibanaContext`.
 */
export declare const createLazyApmComponentWithContext: <T extends React.ComponentType<any>>(coreSetup: ApmCoreSetup, lazyComponentFactory: () => Promise<{
    default: T;
}>, setupDeps?: ApmAlertingSetupDeps) => React.LazyExoticComponent<(props: PropsOf<T>) => React.JSX.Element>;
