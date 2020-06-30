/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppMountParameters, CoreSetup, CoreStart } from 'kibana/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from 'src/plugins/data/public';
import { EmbeddableSetup, EmbeddableStart } from 'src/plugins/embeddable/public';
import { ExpressionsSetup, ExpressionsStart } from 'src/plugins/expressions/public';
import { VisualizationsSetup } from 'src/plugins/visualizations/public';
import { NavigationPublicPluginStart } from 'src/plugins/navigation/public';
import { KibanaLegacySetup } from 'src/plugins/kibana_legacy/public';
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

import { UiActionsStart } from '../../../../src/plugins/ui_actions/public';
import { NOT_INTERNATIONALIZED_PRODUCT_NAME } from '../common';
import { EditorFrameStart } from './types';
import { getLensAliasConfig } from './vis_type_alias';

import './index.scss';

export interface LensPluginSetupDependencies {
  kibanaLegacy: KibanaLegacySetup;
  expressions: ExpressionsSetup;
  data: DataPublicPluginSetup;
  embeddable?: EmbeddableSetup;
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
}

export interface LensPluginStartDependencies {
  data: DataPublicPluginStart;
  expressions: ExpressionsStart;
  navigation: NavigationPublicPluginStart;
  uiActions: UiActionsStart;
  embeddable: EmbeddableStart;
}

export class LensPlugin {
  private datatableVisualization: DatatableVisualization;
  private editorFrameService: EditorFrameService;
  private createEditorFrame: EditorFrameStart['createInstance'] | null = null;
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
      kibanaLegacy,
      expressions,
      data,
      embeddable,
      visualizations,
      charts,
    }: LensPluginSetupDependencies
  ) {
    const editorFrameSetupInterface = this.editorFrameService.setup(core, {
      data,
      embeddable,
      expressions,
    });
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

    core.application.register({
      id: 'lens',
      title: NOT_INTERNATIONALIZED_PRODUCT_NAME,
      navLinkStatus: AppNavLinkStatus.hidden,
      mount: async (params: AppMountParameters) => {
        const { mountApp } = await import('./app_plugin/mounter');
        return mountApp(core, params, this.createEditorFrame!);
      },
    });

    kibanaLegacy.forwardApp('lens', 'lens');
  }

  start(core: CoreStart, startDependencies: LensPluginStartDependencies) {
    this.createEditorFrame = this.editorFrameService.start(core, startDependencies).createInstance;
  }

  stop() {
    stopReportManager();
  }
}
