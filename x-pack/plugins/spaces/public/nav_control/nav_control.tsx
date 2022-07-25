/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom';

import type { CoreStart } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';

import type { SpacesManager } from '../spaces_manager';

export function initSpacesNavControl(spacesManager: SpacesManager, core: CoreStart) {
  const I18nContext = core.i18n.Context;
  const { theme$ } = core.theme;
  core.chrome.navControls.registerLeft({
    order: 1000,
    mount(targetDomElement: HTMLElement) {
      if (core.http.anonymousPaths.isAnonymous(window.location.pathname)) {
        return () => null;
      }

      const LazyNavControlPopover = lazy(() =>
        import('./nav_control_popover').then(({ NavControlPopover }) => ({
          default: NavControlPopover,
        }))
      );

      ReactDOM.render(
        <I18nContext>
          <KibanaThemeProvider theme$={theme$}>
            <Suspense fallback={<EuiLoadingSpinner />}>
              <LazyNavControlPopover
                spacesManager={spacesManager}
                serverBasePath={core.http.basePath.serverBasePath}
                anchorPosition="downLeft"
                capabilities={core.application.capabilities}
                navigateToApp={core.application.navigateToApp}
              />
            </Suspense>
          </KibanaThemeProvider>
        </I18nContext>,
        targetDomElement
      );

      return () => {
        ReactDOM.unmountComponentAtNode(targetDomElement);
      };
    },
  });
}
