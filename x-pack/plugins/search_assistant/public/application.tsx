import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import type { SearchAssistantPluginStartDependencies } from './types';
import { SearchAssistantRouter } from './router';

export const renderApp = (
  core: CoreStart,
  services: SearchAssistantPluginStartDependencies,
  element: HTMLElement
) => {
  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <KibanaContextProvider services={{ ...core, ...services }}>
        <I18nProvider>
          <Router history={services.history}>
            <SearchAssistantRouter />
          </Router>
        </I18nProvider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
