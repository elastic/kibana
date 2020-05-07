/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { AppMountParameters, CoreSetup } from 'kibana/public';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { HashRouter, Route, RouteComponentProps, Switch } from 'react-router-dom';
import { render, unmountComponentAtNode } from 'react-dom';

import rison from 'rison-node';
import { parse } from 'query-string';
import { Storage, removeQueryParam } from '../../../../../src/plugins/kibana_utils/public';

import { LensReportManager, setReportManager, trackUiEvent } from '../lens_ui_telemetry';

import { App } from './app';
import { EditorFrameStart } from '../types';
import { addEmbeddableToDashboardUrl, getUrlVars, isRisonObject } from '../helpers';
import { addHelpMenuToAppChrome } from '../help_menu_util';
import { SavedObjectIndexStore } from '../persistence';
import { LensPluginStartDependencies } from '../plugin';

export async function mountApp(
  core: CoreSetup<LensPluginStartDependencies, void>,
  params: AppMountParameters,
  createEditorFrame: EditorFrameStart['createInstance']
) {
  const [coreStart, startDependencies] = await core.getStartServices();
  const { data: dataStart, navigation } = startDependencies;
  const savedObjectsClient = coreStart.savedObjects.client;
  addHelpMenuToAppChrome(coreStart.chrome, coreStart.docLinks);

  const instance = await createEditorFrame();

  setReportManager(
    new LensReportManager({
      storage: new Storage(localStorage),
      http: core.http,
    })
  );
  const updateUrlTime = (urlVars: Record<string, string>): void => {
    const decoded = rison.decode(urlVars._g);
    if (!isRisonObject(decoded)) {
      return;
    }
    // @ts-ignore
    decoded.time = dataStart.query.timefilter.timefilter.getTime();
    urlVars._g = rison.encode(decoded);
  };
  const redirectTo = (
    routeProps: RouteComponentProps<{ id?: string }>,
    originatingApp: string,
    id?: string,
    returnToOrigin?: boolean,
    newlyCreated?: boolean
  ) => {
    if (!!originatingApp && !returnToOrigin) {
      removeQueryParam(routeProps.history, 'embeddableOriginatingApp');
    }

    if (!id) {
      routeProps.history.push('/lens');
    } else if (!originatingApp) {
      routeProps.history.push(`/lens/edit/${id}`);
    } else if (!!originatingApp && id && returnToOrigin) {
      routeProps.history.push(`/lens/edit/${id}`);
      const originatingAppLink = coreStart.chrome.navLinks.get(originatingApp);
      if (!originatingAppLink || !originatingAppLink.url) {
        throw new Error('Cannot get originating app url');
      }

      // TODO: Remove this and use application.redirectTo after https://github.com/elastic/kibana/pull/63443
      if (originatingApp === 'kibana:dashboard') {
        const addLensId = newlyCreated ? id : '';
        const urlVars = getUrlVars(originatingAppLink.url);
        updateUrlTime(urlVars); // we need to pass in timerange in query params directly
        const dashboardUrl = addEmbeddableToDashboardUrl(
          originatingAppLink.url,
          addLensId,
          urlVars
        );
        window.history.pushState({}, '', dashboardUrl);
      } else {
        window.location.href = originatingAppLink.url;
      }
    }
  };

  const renderEditor = (routeProps: RouteComponentProps<{ id?: string }>) => {
    trackUiEvent('loaded');
    const urlParams = parse(routeProps.location.search) as Record<string, string>;
    const originatingApp = urlParams.embeddableOriginatingApp;

    return (
      <App
        core={coreStart}
        data={dataStart}
        navigation={navigation}
        editorFrame={instance}
        storage={new Storage(localStorage)}
        docId={routeProps.match.params.id}
        docStorage={new SavedObjectIndexStore(savedObjectsClient)}
        redirectTo={(id, returnToOrigin, newlyCreated) =>
          redirectTo(routeProps, originatingApp, id, returnToOrigin, newlyCreated)
        }
        originatingApp={originatingApp}
      />
    );
  };

  function NotFound() {
    trackUiEvent('loaded_404');
    return <FormattedMessage id="xpack.lens.app404" defaultMessage="404 Not Found" />;
  }

  render(
    <I18nProvider>
      <HashRouter>
        <Switch>
          <Route exact path="/lens/edit/:id" render={renderEditor} />
          <Route exact path="/lens" render={renderEditor} />
          <Route path="/lens" component={NotFound} />
        </Switch>
      </HashRouter>
    </I18nProvider>,
    params.element
  );
  return () => {
    instance.unmount();
    unmountComponentAtNode(params.element);
  };
}
