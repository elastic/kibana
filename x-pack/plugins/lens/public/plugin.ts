/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppMountParameters, CoreSetup, CoreStart } from 'kibana/public';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { EmbeddableSetup, EmbeddableStart } from '../../../../src/plugins/embeddable/public';
import { DashboardStart } from '../../../../src/plugins/dashboard/public';
import { ExpressionsSetup, ExpressionsStart } from '../../../../src/plugins/expressions/public';
import {
  VisualizationsSetup,
  VisualizationsStart,
} from '../../../../src/plugins/visualizations/public';
import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';
import { UrlForwardingSetup } from '../../../../src/plugins/url_forwarding/public';
import { GlobalSearchPluginSetup } from '../../global_search/public';
import { ChartsPluginSetup, ChartsPluginStart } from '../../../../src/plugins/charts/public';
import { PresentationUtilPluginStart } from '../../../../src/plugins/presentation_util/public';
import { EmbeddableStateTransfer } from '../../../../src/plugins/embeddable/public';
import { EditorFrameService } from './editor_frame_service';
import { IndexPatternFieldEditorStart } from '../../../../src/plugins/index_pattern_field_editor/public';
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
import { AppNavLinkStatus } from '../../../../src/core/public';
import type { SavedObjectTaggingPluginStart } from '../../saved_objects_tagging/public';

import {
  UiActionsStart,
  ACTION_VISUALIZE_FIELD,
  VISUALIZE_FIELD_TRIGGER,
} from '../../../../src/plugins/ui_actions/public';
import { APP_ID, getEditPath, NOT_INTERNATIONALIZED_PRODUCT_NAME } from '../common';
import type { EditorFrameStart, VisualizationType } from './types';
import { getLensAliasConfig } from './vis_type_alias';
import { visualizeFieldAction } from './trigger_actions/visualize_field_actions';
import { getSearchProvider } from './search_provider';

import { LensAttributeService } from './lens_attribute_service';
import { LensEmbeddableInput } from './editor_frame_service/embeddable';
import {
  EmbeddableComponentProps,
  getEmbeddableComponent,
} from './editor_frame_service/embeddable/embeddable_component';

export interface LensPluginSetupDependencies {
  urlForwarding: UrlForwardingSetup;
  expressions: ExpressionsSetup;
  data: DataPublicPluginSetup;
  embeddable?: EmbeddableSetup;
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
  globalSearch?: GlobalSearchPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface LensPluginStartDependencies {
  data: DataPublicPluginStart;
  expressions: ExpressionsStart;
  navigation: NavigationPublicPluginStart;
  uiActions: UiActionsStart;
  dashboard: DashboardStart;
  visualizations: VisualizationsStart;
  embeddable: EmbeddableStart;
  charts: ChartsPluginStart;
  savedObjectsTagging?: SavedObjectTaggingPluginStart;
  presentationUtil: PresentationUtilPluginStart;
  indexPatternFieldEditor: IndexPatternFieldEditorStart;
}

export interface LensPublicStart {
  /**
   * React component which can be used to embed a Lens visualization into another application.
   * See `x-pack/examples/embedded_lens_example` for exemplary usage.
   *
   * This API might undergo breaking changes even in minor versions.
   *
   * @experimental
   */
  EmbeddableComponent: React.ComponentType<EmbeddableComponentProps>;
  /**
   * Method which navigates to the Lens editor, loading the state specified by the `input` parameter.
   * See `x-pack/examples/embedded_lens_example` for exemplary usage.
   *
   * This API might undergo breaking changes even in minor versions.
   *
   * @experimental
   */
  navigateToPrefilledEditor: (input: LensEmbeddableInput, openInNewTab?: boolean) => void;
  /**
   * Method which returns true if the user has permission to use Lens as defined by application capabilities.
   */
  canUseEditor: () => boolean;

  /**
   * Method which returns xy VisualizationTypes array keeping this async as to not impact page load bundle
   */
  getXyVisTypes: () => Promise<VisualizationType[]>;
}

export class LensPlugin {
  private datatableVisualization: DatatableVisualization;
  private editorFrameService: EditorFrameService;
  private createEditorFrame: EditorFrameStart['createInstance'] | null = null;
  private attributeService: (() => Promise<LensAttributeService>) | null = null;
  private indexpatternDatasource: IndexPatternDatasource;
  private xyVisualization: XyVisualization;
  private metricVisualization: MetricVisualization;
  private pieVisualization: PieVisualization;

  private stopReportManager?: () => void;

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
      usageCollection,
    }: LensPluginSetupDependencies
  ) {
    this.attributeService = async () => {
      const { getLensAttributeService } = await import('./async_services');
      const [coreStart, startDependencies] = await core.getStartServices();
      return getLensAttributeService(coreStart, startDependencies);
    };
    const editorFrameSetupInterface = this.editorFrameService.setup(
      core,
      {
        data,
        embeddable,
        charts,
        expressions,
        usageCollection,
      },
      this.attributeService
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

    const getPresentationUtilContext = async () => {
      const [, deps] = await core.getStartServices();
      const { ContextProvider } = deps.presentationUtil;
      return ContextProvider;
    };

    const ensureDefaultIndexPattern = async () => {
      const [, deps] = await core.getStartServices();
      // make sure a default index pattern exists
      // if not, the page will be redirected to management and visualize won't be rendered
      await deps.data.indexPatterns.ensureDefaultIndexPattern();
    };

    core.application.register({
      id: APP_ID,
      title: NOT_INTERNATIONALIZED_PRODUCT_NAME,
      navLinkStatus: AppNavLinkStatus.hidden,
      mount: async (params: AppMountParameters) => {
        const { mountApp, stopReportManager } = await import('./async_services');
        this.stopReportManager = stopReportManager;
        await ensureDefaultIndexPattern();
        return mountApp(core, params, {
          createEditorFrame: this.createEditorFrame!,
          attributeService: this.attributeService!,
          getByValueFeatureFlag,
          getPresentationUtilContext,
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

  start(core: CoreStart, startDependencies: LensPluginStartDependencies): LensPublicStart {
    const frameStart = this.editorFrameService.start(core, startDependencies);
    this.createEditorFrame = frameStart.createInstance;
    // unregisters the Visualize action and registers the lens one
    if (startDependencies.uiActions.hasAction(ACTION_VISUALIZE_FIELD)) {
      startDependencies.uiActions.unregisterAction(ACTION_VISUALIZE_FIELD);
    }
    startDependencies.uiActions.addTriggerAction(
      VISUALIZE_FIELD_TRIGGER,
      visualizeFieldAction(core.application)
    );

    return {
      EmbeddableComponent: getEmbeddableComponent(startDependencies.embeddable),
      navigateToPrefilledEditor: (input: LensEmbeddableInput, openInNewTab?: boolean) => {
        // for openInNewTab, we set the time range in url via getEditPath below
        if (input.timeRange && !openInNewTab) {
          startDependencies.data.query.timefilter.timefilter.setTime(input.timeRange);
        }
        const transfer = new EmbeddableStateTransfer(
          core.application.navigateToApp,
          core.application.currentAppId$
        );
        transfer.navigateToEditor('lens', {
          openInNewTab,
          path: getEditPath(undefined, openInNewTab ? input.timeRange : undefined),
          state: {
            originatingApp: '',
            valueInput: input,
          },
        });
      },
      canUseEditor: () => {
        return Boolean(core.application.capabilities.visualize?.show);
      },
      getXyVisTypes: async () => {
        const { visualizationTypes } = await import('./xy_visualization/types');
        return visualizationTypes;
      },
    };
  }

  stop() {
    if (this.stopReportManager) {
      this.stopReportManager();
    }
  }
}
