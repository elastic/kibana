/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppMountParameters, CoreSetup, CoreStart } from 'kibana/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from 'src/plugins/data/public';
import { EmbeddableSetup, EmbeddableStart } from 'src/plugins/embeddable/public';
import { DashboardStart } from 'src/plugins/dashboard/public';
import { ExpressionsSetup, ExpressionsStart } from 'src/plugins/expressions/public';
import { VisualizationsSetup } from 'src/plugins/visualizations/public';
import { NavigationPublicPluginStart } from 'src/plugins/navigation/public';
import { UrlForwardingSetup } from 'src/plugins/url_forwarding/public';
import { GlobalSearchPluginSetup } from '../../global_search/public';
import { ChartsPluginSetup } from '../../../../src/plugins/charts/public';
import { EditorFrameService } from './editor_frame_service';
import {
  IndexPatternDatasource,
  IndexPatternDatasourceSetupPlugins,
} from './indexpattern_datasource';
import { XyVisualization, XyVisualizationPluginSetupPlugins } from './xy_visualization';
import { MetricVisualization, MetricVisualizationPluginSetupPlugins } from './metric_visualization';
import {
  DatatableVisualization,
  DatatableVisualizationPluginSetupPlugins,
} from './datatable_visualization';
import { PieVisualization, PieVisualizationPluginSetupPlugins } from './pie_visualization';
import { stopReportManager } from './lens_ui_telemetry';
import { AppNavLinkStatus } from '../../../../src/core/public';

import {
  UiActionsStart,
  ACTION_VISUALIZE_FIELD,
  VISUALIZE_FIELD_TRIGGER,
} from '../../../../src/plugins/ui_actions/public';
import { NOT_INTERNATIONALIZED_PRODUCT_NAME } from '../common';
import { EditorFrameStart } from './types';
import { getLensAliasConfig } from './vis_type_alias';
import { visualizeFieldAction } from './trigger_actions/visualize_field_actions';
import { getSearchProvider } from './search_provider';

import { getLensAttributeService, LensAttributeService } from './lens_attribute_service';

export interface LensPluginSetupDependencies {
  urlForwarding: UrlForwardingSetup;
  expressions: ExpressionsSetup;
  data: DataPublicPluginSetup;
  embeddable?: EmbeddableSetup;
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
  globalSearch?: GlobalSearchPluginSetup;
}

export interface LensPluginStartDependencies {
  data: DataPublicPluginStart;
  expressions: ExpressionsStart;
  navigation: NavigationPublicPluginStart;
  uiActions: UiActionsStart;
  dashboard: DashboardStart;
  embeddable: EmbeddableStart;
}
export class LensPlugin {
  private datatableVisualization: DatatableVisualization;
  private editorFrameService: EditorFrameService;
  private createEditorFrame: EditorFrameStart['createInstance'] | null = null;
  private attributeService: LensAttributeService | null = null;
  private indexpatternDatasource: IndexPatternDatasource;
  private xyVisualization: XyVisualization;
  private metricVisualization: MetricVisualization;
  private pieVisualization: PieVisualization;

  constructor() {
    this.datatableVisualization = new DatatableVisualization();
    this.editorFrameService = new EditorFrameService();
    this.indexpatternDatasource = new IndexPatternDatasource();
    this.xyVisualization = new XyVisualization();
    this.metricVisualization = new MetricVisualization();
    this.pieVisualization = new PieVisualization();
  }

  setup(
    core: CoreSetup<LensPluginStartDependencies, void>,
    {
      urlForwarding,
      expressions,
      data,
      embeddable,
      visualizations,
      charts,
      globalSearch,
    }: LensPluginSetupDependencies
  ) {
    const editorFrameSetupInterface = this.editorFrameService.setup(
      core,
      {
        data,
        embeddable,
        expressions,
      },
      () => this.attributeService!
    );
    const dependencies: IndexPatternDatasourceSetupPlugins &
      XyVisualizationPluginSetupPlugins &
      DatatableVisualizationPluginSetupPlugins &
      MetricVisualizationPluginSetupPlugins &
      PieVisualizationPluginSetupPlugins = {
      expressions,
      data,
      charts,
      editorFrame: editorFrameSetupInterface,
      formatFactory: core
        .getStartServices()
        .then(([_, { data: dataStart }]) => dataStart.fieldFormats.deserialize),
    };
    this.indexpatternDatasource.setup(core, dependencies);
    this.xyVisualization.setup(core, dependencies);
    this.datatableVisualization.setup(core, dependencies);
    this.metricVisualization.setup(core, dependencies);
    this.pieVisualization.setup(core, dependencies);

    visualizations.registerAlias(getLensAliasConfig());

    const getByValueFeatureFlag = async () => {
      const [, deps] = await core.getStartServices();
      return deps.dashboard.dashboardFeatureFlagConfig;
    };

    core.application.register({
      id: 'lens',
      title: NOT_INTERNATIONALIZED_PRODUCT_NAME,
      navLinkStatus: AppNavLinkStatus.hidden,
      mount: async (params: AppMountParameters) => {
        const { mountApp } = await import('./async_services');
        return mountApp(core, params, {
          createEditorFrame: this.createEditorFrame!,
          attributeService: this.attributeService!,
          getByValueFeatureFlag,
        });
      },
    });

    if (globalSearch) {
      globalSearch.registerResultProvider(
        getSearchProvider(
          core.getStartServices().then(
            ([
              {
                application: { capabilities },
              },
            ]) => capabilities
          )
        )
      );
    }

    urlForwarding.forwardApp('lens', 'lens');
  }

  start(core: CoreStart, startDependencies: LensPluginStartDependencies) {
    this.attributeService = getLensAttributeService(core, startDependencies);
    this.createEditorFrame = this.editorFrameService.start(core, startDependencies).createInstance;
    // unregisters the Visualize action and registers the lens one
    if (startDependencies.uiActions.hasAction(ACTION_VISUALIZE_FIELD)) {
      startDependencies.uiActions.unregisterAction(ACTION_VISUALIZE_FIELD);
    }
    startDependencies.uiActions.addTriggerAction(
      VISUALIZE_FIELD_TRIGGER,
      visualizeFieldAction(core.application)
    );
  }

  stop() {
    stopReportManager();
  }
}
