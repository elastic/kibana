/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { HashRouter, Route, RouteComponentProps, Switch } from 'react-router-dom';
import { render, unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';

import { AppMountParameters, CoreSetup, CoreStart } from 'kibana/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from 'src/plugins/data/public';
import { EmbeddableSetup, EmbeddableStart } from 'src/plugins/embeddable/public';
import { ExpressionsSetup, ExpressionsStart } from 'src/plugins/expressions/public';
import { VisualizationsSetup } from 'src/plugins/visualizations/public';
import { NavigationPublicPluginStart } from 'src/plugins/navigation/public';
import { KibanaLegacySetup } from 'src/plugins/kibana_legacy/public';
import { DashboardConstants, DashboardStart } from '../../../../src/plugins/dashboard/public';
import { Storage } from '../../../../src/plugins/kibana_utils/public';
import { EditorFrameService } from './editor_frame_service';
import { IndexPatternDatasource } from './indexpattern_datasource';
import { addHelpMenuToAppChrome } from './help_menu_util';
import { SavedObjectIndexStore } from './persistence';
import { XyVisualization } from './xy_visualization';
import { MetricVisualization } from './metric_visualization';
import { DatatableVisualization } from './datatable_visualization';
import { App } from './app_plugin';
import {
  LensReportManager,
  setReportManager,
  stopReportManager,
  trackUiEvent,
} from './lens_ui_telemetry';
import { AppNavLinkStatus } from '../../../../src/core/public';

import { UiActionsStart } from '../../../../src/plugins/ui_actions/public';
import { LENS_EMBEDDABLE_TYPE, NOT_INTERNATIONALIZED_PRODUCT_NAME } from '../common';
import { EditorFrameStart } from './types';
import { getLensAliasConfig } from './vis_type_alias';

import './index.scss';

export interface LensPluginSetupDependencies {
  kibanaLegacy: KibanaLegacySetup;
  expressions: ExpressionsSetup;
  data: DataPublicPluginSetup;
  embeddable?: EmbeddableSetup;
  visualizations: VisualizationsSetup;
}

export interface LensPluginStartDependencies {
  data: DataPublicPluginStart;
  embeddable: EmbeddableStart;
  expressions: ExpressionsStart;
  navigation: NavigationPublicPluginStart;
  uiActions: UiActionsStart;
  dashboard: DashboardStart;
}

export class LensPlugin {
  private datatableVisualization: DatatableVisualization;
  private editorFrameService: EditorFrameService;
  private createEditorFrame: EditorFrameStart['createInstance'] | null = null;
  private indexpatternDatasource: IndexPatternDatasource;
  private xyVisualization: XyVisualization;
  private metricVisualization: MetricVisualization;

  constructor() {
    this.datatableVisualization = new DatatableVisualization();
    this.editorFrameService = new EditorFrameService();
    this.indexpatternDatasource = new IndexPatternDatasource();
    this.xyVisualization = new XyVisualization();
    this.metricVisualization = new MetricVisualization();
  }

  setup(
    core: CoreSetup<LensPluginStartDependencies, void>,
    { kibanaLegacy, expressions, data, embeddable, visualizations }: LensPluginSetupDependencies
  ) {
    const editorFrameSetupInterface = this.editorFrameService.setup(core, {
      data,
      embeddable,
      expressions,
    });
    const dependencies = {
      expressions,
      data,
      editorFrame: editorFrameSetupInterface,
      formatFactory: core
        .getStartServices()
        .then(([_, { data: dataStart }]) => dataStart.fieldFormats.deserialize),
    };
    this.indexpatternDatasource.setup(core, dependencies);
    this.xyVisualization.setup(core, dependencies);
    this.datatableVisualization.setup(core, dependencies);
    this.metricVisualization.setup(core, dependencies);

    visualizations.registerAlias(getLensAliasConfig());

    core.application.register({
      id: 'lens',
      navLinkStatus: AppNavLinkStatus.hidden,
      title: NOT_INTERNATIONALIZED_PRODUCT_NAME,
      mount: async (params: AppMountParameters) => {
        const [coreStart, startDependencies] = await core.getStartServices();
        const { data: dataStart, navigation } = startDependencies;
        const savedObjectsClient = coreStart.savedObjects.client;
        addHelpMenuToAppChrome(coreStart.chrome, coreStart.docLinks);

        coreStart.chrome.docTitle.change(
          i18n.translate('xpack.lens.pageTitle', { defaultMessage: 'Lens' })
        );

        const instance = await this.createEditorFrame!();

        setReportManager(
          new LensReportManager({
            storage: new Storage(localStorage),
            http: core.http,
          })
        );
        const redirectTo = (
          routeProps: RouteComponentProps<{ id?: string }>,
          addToDashboardMode: boolean,
          id?: string
        ) => {
          if (!id) {
            routeProps.history.push('/');
          } else if (!addToDashboardMode) {
            routeProps.history.push(`/edit/${id}`);
          } else if (addToDashboardMode && id) {
            routeProps.history.push(`/edit/${id}`);
            startDependencies.dashboard.addEmbeddableToDashboard({
              embeddableId: id,
              embeddableType: LENS_EMBEDDABLE_TYPE,
            });
          }
        };

        const renderEditor = (routeProps: RouteComponentProps<{ id?: string }>) => {
          trackUiEvent('loaded');
          const addToDashboardMode =
            !!routeProps.location.search &&
            routeProps.location.search.includes(
              DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM
            );
          return (
            <App
              core={coreStart}
              data={dataStart}
              navigation={navigation}
              editorFrame={instance}
              storage={new Storage(localStorage)}
              docId={routeProps.match.params.id}
              docStorage={new SavedObjectIndexStore(savedObjectsClient)}
              redirectTo={id => redirectTo(routeProps, addToDashboardMode, id)}
              addToDashboardMode={addToDashboardMode}
            />
          );
        };

        function NotFound() {
          trackUiEvent('loaded_404');
          return <FormattedMessage id="xpack.lens.app404" defaultMessage="404 Not Found" />;
        }

        params.element.classList.add('lnsAppWrapper');
        render(
          <I18nProvider>
            <HashRouter>
              <Switch>
                <Route exact path="/edit/:id" render={renderEditor} />
                <Route exact path="/" render={renderEditor} />
                <Route component={NotFound} />
              </Switch>
            </HashRouter>
          </I18nProvider>,
          params.element
        );
        return () => {
          instance.unmount();
          unmountComponentAtNode(params.element);
        };
      },
    });

    kibanaLegacy.forwardApp('lens', 'lens', path => {
      const newPath = path.replace(/\/lens/, '');
      return `#${newPath}`;
    });
  }

  start(core: CoreStart, startDependencies: LensPluginStartDependencies) {
    this.createEditorFrame = this.editorFrameService.start(core, startDependencies).createInstance;
    this.xyVisualization.start(core, startDependencies);
  }

  stop() {
    stopReportManager();
  }
}
