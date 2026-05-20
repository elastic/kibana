import React from 'react';
import type { EmbeddableDeps } from './types';
export interface ApmEmbeddableContextProps {
    deps: EmbeddableDeps;
    children: React.ReactNode;
    rangeFrom?: string;
    rangeTo?: string;
    kuery?: string;
    /** Seeded into the in-memory router URL so hooks reading URL params get a concrete env. */
    environment?: string;
}
/** Providers for dashboard/flyout embeddables. Uses `I18nProvider` for react-intl but omits Core `i18n.Context` (`EuiContext`) and `KibanaThemeProvider` so the DOM stays shallow for flyout flex layout; theme/CSS still comes from the host `KibanaRenderContextProvider`. */
export declare function ApmEmbeddableContext({ rangeFrom, rangeTo, kuery, environment, deps, children, }: ApmEmbeddableContextProps): React.JSX.Element;
