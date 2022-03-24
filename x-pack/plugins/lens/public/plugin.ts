/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreSetup, CoreStart } from 'kibana/public';
import type { Start as InspectorStartContract } from 'src/plugins/inspector/public';
import type { FieldFormatsSetup, FieldFormatsStart } from 'src/plugins/field_formats/public';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from 'src/plugins/usage_collection/public';
import type {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../src/plugins/data/public';
import type { DataViewsPublicPluginStart } from '../../../../src/plugins/data_views/public';
import type { EmbeddableSetup, EmbeddableStart } from '../../../../src/plugins/embeddable/public';
import type { DashboardStart } from '../../../../src/plugins/dashboard/public';
import type { SpacesPluginStart } from '../../spaces/public';
import type {
  ExpressionsServiceSetup,
  ExpressionsSetup,
  ExpressionsStart,
} from '../../../../src/plugins/expressions/public';
import type {
  VisualizationsSetup,
  VisualizationsStart,
} from '../../../../src/plugins/visualizations/public';
import type { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';
import type { UrlForwardingSetup } from '../../../../src/plugins/url_forwarding/public';
import type { GlobalSearchPluginSetup } from '../../global_search/public';
import type { ChartsPluginSetup, ChartsPluginStart } from '../../../../src/plugins/charts/public';
import type { EventAnnotationPluginSetup } from '../../../../src/plugins/event_annotation/public';
import type { PresentationUtilPluginStart } from '../../../../src/plugins/presentation_util/public';
import { EmbeddableStateTransfer } from '../../../../src/plugins/embeddable/public';
import type { EditorFrameService as EditorFrameServiceType } from './editor_frame_service';
import { IndexPatternFieldEditorStart } from '../../../../src/plugins/data_view_field_editor/public';
import type {
  IndexPatternDatasource as IndexPatternDatasourceType,
  IndexPatternDatasourceSetupPlugins,
  FormulaPublicApi,
} from './indexpattern_datasource';
import type {
  XyVisualization as XyVisualizationType,
  XyVisualizationPluginSetupPlugins,
} from './xy_visualization';
import type {
  MetricVisualization as MetricVisualizationType,
  MetricVisualizationPluginSetupPlugins,
} from './metric_visualization';
import type {
  DatatableVisualization as DatatableVisualizationType,
  DatatableVisualizationPluginSetupPlugins,
} from './datatable_visualization';
import type {
  PieVisualization as PieVisualizationType,
  PieVisualizationPluginSetupPlugins,
} from './pie_visualization';
import type { HeatmapVisualization as HeatmapVisualizationType } from './heatmap_visualization';
import type { GaugeVisualization as GaugeVisualizationType } from './visualizations/gauge';
import type { SavedObjectTaggingPluginStart } from '../../saved_objects_tagging/public';

import { AppNavLinkStatus } from '../../../../src/core/public';

import {
  UiActionsStart,
  ACTION_VISUALIZE_FIELD,
  VISUALIZE_FIELD_TRIGGER,
} from '../../../../src/plugins/ui_actions/public';
import { VISUALIZE_EDITOR_TRIGGER } from '../../../../src/plugins/visualizations/public';
import { APP_ID, getEditPath, NOT_INTERNATIONALIZED_PRODUCT_NAME } from '../common/constants';
import type { FormatFactory } from '../common/types';
import type {
  Visualization,
  VisualizationType,
  EditorFrameSetup,
  LensTopNavMenuEntryGenerator,
} from './types';
import { getLensAliasConfig } from './vis_type_alias';
import { visualizeFieldAction } from './trigger_actions/visualize_field_actions';
import { visualizeTSVBAction } from './trigger_actions/visualize_tsvb_actions';

import type { LensEmbeddableInput } from './embeddable';
import { EmbeddableFactory, LensEmbeddableStartServices } from './embeddable/embeddable_factory';
import {
  EmbeddableComponentProps,
  getEmbeddableComponent,
} from './embeddable/embeddable_component';
import { getSaveModalComponent } from './app_plugin/shared/saved_modal_lazy';
import type { SaveModalContainerProps } from './app_plugin/save_modal_container';

import { createStartServicesGetter } from '../../../../src/plugins/kibana_utils/public';
import { setupExpressions } from './expressions';
import { getSearchProvider } from './search_provider';
import type { DiscoverSetup, DiscoverStart } from '../../../../src/plugins/discover/public';

export interface LensPluginSetupDependencies {
  urlForwarding: UrlForwardingSetup;
  expressions: ExpressionsSetup;
  data: DataPublicPluginSetup;
  fieldFormats: FieldFormatsSetup;
  embeddable?: EmbeddableSetup;
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
  eventAnnotation: EventAnnotationPluginSetup;
  globalSearch?: GlobalSearchPluginSetup;
  usageCollection?: UsageCollectionSetup;
  discover?: DiscoverSetup;
}

export interface LensPluginStartDependencies {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  expressions: ExpressionsStart;
  navigation: NavigationPublicPluginStart;
  uiActions: UiActionsStart;
  dashboard: DashboardStart;
  visualizations: VisualizationsStart;
  embeddable: EmbeddableStart;
  charts: ChartsPluginStart;
  eventAnnotation: EventAnnotationPluginSetup;
  savedObjectsTagging?: SavedObjectTaggingPluginStart;
  presentationUtil: PresentationUtilPluginStart;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  inspector: InspectorStartContract;
  spaces: SpacesPluginStart;
  usageCollection?: UsageCollectionStart;
  discover?: DiscoverStart;
}

export interface LensPublicSetup {
  /**
   * Register 3rd party visualization type
   * See `x-pack/examples/3rd_party_lens_vis` for exemplary usage.
   *
   * In case the visualization is a function returning a promise, it will only be called once Lens is actually requiring it.
   * This can be used to lazy-load parts of the code to keep the initial bundle as small as possible.
   *
   * This API might undergo breaking changes even in minor versions.
   *
   * @experimental
   */
  registerVisualization: <T>(
    visualization: Visualization<T> | (() => Promise<Visualization<T>>)
  ) => void;
  /**
   * Register a generic menu entry shown in the top nav
   * See `x-pack/examples/3rd_party_lens_navigation_prompt` for exemplary usage.
   *
   * This API might undergo breaking changes even in minor versions.
   *
   * @experimental
   */
  registerTopNavMenuEntryGenerator: (
    navigationPromptGenerator: LensTopNavMenuEntryGenerator
  ) => void;
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
   * React component which can be used to embed a Lens Visualization Save Modal Component.
   * See `x-pack/examples/embedded_lens_example` for exemplary usage.
   *
   * This API might undergo breaking changes even in minor versions.
   *
   * @experimental
   */
  SaveModalComponent: React.ComponentType<Omit<SaveModalContainerProps, 'lensServices'>>;
  /**
   * Method which navigates to the Lens editor, loading the state specified by the `input` parameter.
   * See `x-pack/examples/embedded_lens_example` for exemplary usage.
   *
   * This API might undergo breaking changes even in minor versions.
   *
   * @experimental
   */
  navigateToPrefilledEditor: (
    input: LensEmbeddableInput | undefined,
    options?: {
      openInNewTab?: boolean;
      originatingApp?: string;
      originatingPath?: string;
    }
  ) => void;
  /**
   * Method which returns true if the user has permission to use Lens as defined by application capabilities.
   */
  canUseEditor: () => boolean;

  /**
   * Method which returns xy VisualizationTypes array keeping this async as to not impact page load bundle
   */
  getXyVisTypes: () => Promise<VisualizationType[]>;

  /**
   * API which returns state helpers keeping this async as to not impact page load bundle
   */
  stateHelperApi: () => Promise<{
    formula: FormulaPublicApi;
  }>;
}

export class LensPlugin {
  private datatableVisualization: DatatableVisualizationType | undefined;
  private editorFrameService: EditorFrameServiceType | undefined;
  private editorFrameSetup: EditorFrameSetup | undefined;
  private queuedVisualizations: Array<Visualization | (() => Promise<Visualization>)> = [];
  private indexpatternDatasource: IndexPatternDatasourceType | undefined;
  private xyVisualization: XyVisualizationType | undefined;
  private metricVisualization: MetricVisualizationType | undefined;
  private pieVisualization: PieVisualizationType | undefined;
  private heatmapVisualization: HeatmapVisualizationType | undefined;
  private gaugeVisualization: GaugeVisualizationType | undefined;
  private topNavMenuEntries: LensTopNavMenuEntryGenerator[] = [];

  private stopReportManager?: () => void;

  setup(
    core: CoreSetup<LensPluginStartDependencies, void>,
    {
      urlForwarding,
      expressions,
      data,
      fieldFormats,
      embeddable,
      visualizations,
      charts,
      eventAnnotation,
      globalSearch,
      usageCollection,
    }: LensPluginSetupDependencies
  ) {
    const startServices = createStartServicesGetter(core.getStartServices);

    const getStartServices = async (): Promise<LensEmbeddableStartServices> => {
      const { getLensAttributeService } = await import('./async_services');
      const { core: coreStart, plugins } = startServices();

      await this.initParts(
        core,
        data,
        charts,
        expressions,
        fieldFormats,
        plugins.fieldFormats.deserialize,
        eventAnnotation
      );
      const visualizationMap = await this.editorFrameService!.loadVisualizations();

      return {
        attributeService: getLensAttributeService(coreStart, plugins),
        capabilities: coreStart.application.capabilities,
        coreHttp: coreStart.http,
        timefilter: plugins.data.query.timefilter.timefilter,
        expressionRenderer: plugins.expressions.ReactExpressionRenderer,
        documentToExpression: this.editorFrameService!.documentToExpression,
        injectFilterReferences: data.query.filterManager.inject.bind(data.query.filterManager),
        visualizationMap,
        indexPatternService: plugins.dataViews,
        uiActions: plugins.uiActions,
        usageCollection,
        inspector: plugins.inspector,
        spaces: plugins.spaces,
        theme: core.theme,
      };
    };

    if (embeddable) {
      embeddable.registerEmbeddableFactory('lens', new EmbeddableFactory(getStartServices));
    }

    visualizations.registerAlias(getLensAliasConfig());

    setupExpressions(
      expressions,
      () => startServices().plugins.fieldFormats.deserialize,
      async () => {
        const { getTimeZone } = await import('./utils');
        return getTimeZone(core.uiSettings);
      }
    );

    const getPresentationUtilContext = () =>
      startServices().plugins.presentationUtil.ContextProvider;

    const ensureDefaultDataView = () => {
      // make sure a default index pattern exists
      // if not, the page will be redirected to management and visualize won't be rendered
      startServices().plugins.dataViews.ensureDefaultDataView();
    };

    core.application.register({
      id: APP_ID,
      title: NOT_INTERNATIONALIZED_PRODUCT_NAME,
      navLinkStatus: AppNavLinkStatus.hidden,
      mount: async (params: AppMountParameters) => {
        const { core: coreStart, plugins: deps } = startServices();

        await Promise.all([
          this.initParts(
            core,
            data,
            charts,
            expressions,
            fieldFormats,
            deps.fieldFormats.deserialize,
            eventAnnotation
          ),
          ensureDefaultDataView(),
        ]);

        const { mountApp, stopReportManager, getLensAttributeService } = await import(
          './async_services'
        );
        this.stopReportManager = stopReportManager;

        const frameStart = this.editorFrameService!.start(coreStart, deps);
        return mountApp(core, params, {
          createEditorFrame: frameStart.createInstance,
          attributeService: getLensAttributeService(coreStart, deps),
          getPresentationUtilContext,
          topNavMenuEntryGenerators: this.topNavMenuEntries,
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

    return {
      registerVisualization: (vis: Visualization | (() => Promise<Visualization>)) => {
        if (this.editorFrameSetup) {
          this.editorFrameSetup.registerVisualization(vis);
        } else {
          // queue visualizations if editor frame is not yet ready as it's loaded async
          this.queuedVisualizations.push(vis);
        }
      },
      registerTopNavMenuEntryGenerator: (menuEntryGenerator: LensTopNavMenuEntryGenerator) => {
        this.topNavMenuEntries.push(menuEntryGenerator);
      },
    };
  }

  private async initParts(
    core: CoreSetup<LensPluginStartDependencies, void>,
    data: DataPublicPluginSetup,
    charts: ChartsPluginSetup,
    expressions: ExpressionsServiceSetup,
    fieldFormats: FieldFormatsSetup,
    formatFactory: FormatFactory,
    eventAnnotation: EventAnnotationPluginSetup
  ) {
    const {
      DatatableVisualization,
      EditorFrameService,
      IndexPatternDatasource,
      XyVisualization,
      MetricVisualization,
      PieVisualization,
      HeatmapVisualization,
      GaugeVisualization,
    } = await import('./async_services');
    this.datatableVisualization = new DatatableVisualization();
    this.editorFrameService = new EditorFrameService();
    this.indexpatternDatasource = new IndexPatternDatasource();
    this.xyVisualization = new XyVisualization();
    this.metricVisualization = new MetricVisualization();
    this.pieVisualization = new PieVisualization();
    this.heatmapVisualization = new HeatmapVisualization();
    this.gaugeVisualization = new GaugeVisualization();

    const editorFrameSetupInterface = this.editorFrameService.setup();

    const dependencies: IndexPatternDatasourceSetupPlugins &
      XyVisualizationPluginSetupPlugins &
      DatatableVisualizationPluginSetupPlugins &
      MetricVisualizationPluginSetupPlugins &
      PieVisualizationPluginSetupPlugins = {
      expressions,
      data,
      fieldFormats,
      charts,
      editorFrame: editorFrameSetupInterface,
      formatFactory,
      eventAnnotation,
    };
    this.indexpatternDatasource.setup(core, dependencies);
    this.xyVisualization.setup(core, dependencies);
    this.datatableVisualization.setup(core, dependencies);
    this.metricVisualization.setup(core, dependencies);
    this.pieVisualization.setup(core, dependencies);
    this.heatmapVisualization.setup(core, dependencies);
    this.gaugeVisualization.setup(core, dependencies);

    this.queuedVisualizations.forEach((queuedVis) => {
      editorFrameSetupInterface.registerVisualization(queuedVis);
    });
    this.editorFrameSetup = editorFrameSetupInterface;
  }

  start(core: CoreStart, startDependencies: LensPluginStartDependencies): LensPublicStart {
    // unregisters the Visualize action and registers the lens one
    if (startDependencies.uiActions.hasAction(ACTION_VISUALIZE_FIELD)) {
      startDependencies.uiActions.unregisterAction(ACTION_VISUALIZE_FIELD);
    }
    startDependencies.uiActions.addTriggerAction(
      VISUALIZE_FIELD_TRIGGER,
      visualizeFieldAction(core.application)
    );

    startDependencies.uiActions.addTriggerAction(
      VISUALIZE_EDITOR_TRIGGER,
      visualizeTSVBAction(core.application)
    );

    return {
      EmbeddableComponent: getEmbeddableComponent(core, startDependencies),
      SaveModalComponent: getSaveModalComponent(core, startDependencies),
      navigateToPrefilledEditor: (
        input,
        { openInNewTab = false, originatingApp = '', originatingPath } = {}
      ) => {
        // for openInNewTab, we set the time range in url via getEditPath below
        if (input?.timeRange && !openInNewTab) {
          startDependencies.data.query.timefilter.timefilter.setTime(input.timeRange);
        }
        const transfer = new EmbeddableStateTransfer(
          core.application.navigateToApp,
          core.application.currentAppId$
        );
        transfer.navigateToEditor(APP_ID, {
          openInNewTab,
          path: getEditPath(undefined, (openInNewTab && input?.timeRange) || undefined),
          state: {
            originatingApp,
            originatingPath,
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

      stateHelperApi: async () => {
        const { createFormulaPublicApi } = await import('./async_services');

        return {
          formula: createFormulaPublicApi(),
        };
      },
    };
  }

  stop() {
    if (this.stopReportManager) {
      this.stopReportManager();
    }
  }
}
