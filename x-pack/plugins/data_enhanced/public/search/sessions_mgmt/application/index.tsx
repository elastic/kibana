/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/public';
import * as Rx from 'rxjs';
import { first } from 'rxjs/operators';
import { ManagementAppMountParams } from 'src/plugins/management/public';
import { SharePluginStart } from 'src/plugins/share/public';
import {
  APP,
  AppDependencies,
  IManagementSectionsPluginsSetup,
  IManagementSectionsPluginsStart,
} from '../';
import { SearchSessionsMgmtAPI } from '../lib/api';
import { AsyncSearchIntroDocumentation } from '../lib/documentation';
import { renderApp } from './render';

type UrlGeneratorsStart = SharePluginStart['urlGenerators'];

//
export class SearchSessionsMgmtApp {
  private urls$ = new Rx.Subject<UrlGeneratorsStart>();

  constructor(
    private coreSetup: CoreSetup<IManagementSectionsPluginsStart>,
    private params: ManagementAppMountParams,
    private pluginsSetup: IManagementSectionsPluginsSetup
  ) {
    this.urls$.pipe(first()).subscribe((urls) => {});
  }

  public async mountManagementSection() {
    const { coreSetup, params, pluginsSetup } = this;
    const [coreStart, pluginsStart] = await coreSetup.getStartServices();

    const {
      chrome: { docTitle },
      http,
      docLinks,
      i18n,
      notifications,
      uiSettings,
    } = coreStart;
    const { data, share } = pluginsStart;

    const pluginName = APP.getI18nName();
    docTitle.change(pluginName);
    params.setBreadcrumbs([{ text: pluginName }]);

    const { sessionsClient } = data.search;
    const api = new SearchSessionsMgmtAPI(sessionsClient, share.urlGenerators, notifications);

    const documentation = new AsyncSearchIntroDocumentation();
    documentation.setup(docLinks);

    const dependencies: AppDependencies = {
      plugins: pluginsSetup,
      documentation,
      api,
      http,
      i18n,
      uiSettings,
      share,
    };
    const initialTable = await api.fetchTableData();

    const { element } = params;
    const unmountAppCb = renderApp(element, dependencies, initialTable);

    return () => {
      docTitle.reset();
      unmountAppCb();
    };
  }
}

export { renderApp };
