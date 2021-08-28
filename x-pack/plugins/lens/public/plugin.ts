/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup, CoreStart } from '../../../../src/core/public/types';
import type { AppMountParameters } from '../../../../src/core/public/application/types';
import { AppNavLinkStatus } from '../../../../src/core/public/application/types';
import type {
  ChartsPluginSetup,
  ChartsPluginStart,
} from '../../../../src/plugins/charts/public/types';
import type { DashboardStart } from '../../../../src/plugins/dashboard/public/plugin_contract';
import type {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../src/plugins/data/public/types';
import { EmbeddableStateTransfer } from '../../../../src/plugins/embeddable/public/lib/state_transfer/embeddable_state_transfer';
import type {
  EmbeddableSetup,
  EmbeddableStart,
} from '../../../../src/plugins/embeddable/public/plugin';
import type { ExpressionsServiceSetup } from '../../../../src/plugins/expressions/common/service/expressions_services';
import type {
  ExpressionsSetup,
  ExpressionsStart,
} from '../../../../src/plugins/expressions/public/plugin';
import type {
  FieldFormatsSetup,
  FieldFormatsStart,
} from '../../../../src/plugins/field_formats/public/plugin';
import type { PluginStart as IndexPatternFieldEditorStart } from '../../../../src/plugins/index_pattern_field_editor/public/types';
import type { Start as InspectorStartContract } from '../../../../src/plugins/inspector/public/plugin';
import type { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public/types';
import type { PresentationUtilPluginStart } from '../../../../src/plugins/presentation_util/public/types';
import type { UiActionsStart } from '../../../../src/plugins/ui_actions/public/plugin';
import { VISUALIZE_FIELD_TRIGGER } from '../../../../src/plugins/ui_actions/public/triggers/visualize_field_trigger';
import { ACTION_VISUALIZE_FIELD } from '../../../../src/plugins/ui_actions/public/types';
import type { UrlForwardingSetup } from '../../../../src/plugins/url_forwarding/public/plugin';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '../../../../src/plugins/usage_collection/public/plugin';
import type {
  VisualizationsSetup,
  VisualizationsStart,
} from '../../../../src/plugins/visualizations/public/plugin';
import type { GlobalSearchPluginSetup } from '../../global_search/public/types';
import type { SavedObjectTaggingPluginStart } from '../../saved_objects_tagging/public/types';
import { APP_ID, getEditPath, NOT_INTERNATIONALIZED_PRODUCT_NAME } from '../common/constants';
import type { FormatFactory } from '../common/types';
import type { SaveModalContainerProps } from './app_plugin/save_modal_container';
import { getSaveModalComponent } from './app_plugin/shared/saved_modal_lazy';
import type { DatatableVisualizationPluginSetupPlugins } from './datatable_visualization';
import { DatatableVisualization as DatatableVisualizationType } from './datatable_visualization';
import { EditorFrameService as EditorFrameServiceType } from './editor_frame_service/service';
import type { LensEmbeddableInput } from './embeddable/embeddable';
import type { EmbeddableComponentProps } from './embeddable/embeddable_component';
import { getEmbeddableComponent } from './embeddable/embeddable_component';
import type { LensEmbeddableStartServices } from './embeddable/embeddable_factory';
import { EmbeddableFactory } from './embeddable/embeddable_factory';
import { HeatmapVisualization as HeatmapVisualizationType } from './heatmap_visualization';
import type { IndexPatternDatasourceSetupPlugins } from './indexpattern_datasource';
import { IndexPatternDatasource as IndexPatternDatasourceType } from './indexpattern_datasource';
import type { LensAttributeService } from './lens_attribute_service';
import type { MetricVisualizationPluginSetupPlugins } from './metric_visualization';
import { MetricVisualization as MetricVisualizationType } from './metric_visualization';
import type { PieVisualizationPluginSetupPlugins } from './pie_visualization';
import { PieVisualization as PieVisualizationType } from './pie_visualization';
import { getSearchProvider } from './search_provider';
import { visualizeFieldAction } from './trigger_actions/visualize_field_actions';
import type { EditorFrameStart, VisualizationType } from './types';
import { getLensAliasConfig } from './vis_type_alias';
import type { XyVisualizationPluginSetupPlugins } from './xy_visualization';
import { XyVisualization as XyVisualizationType } from './xy_visualization';

export interface LensPluginSetupDependencies {
  urlForwarding: UrlForwardingSetup;
  expressions: ExpressionsSetup;
  data: DataPublicPluginSetup;
  fieldFormats: FieldFormatsSetup;
  embeddable?: EmbeddableSetup;
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
  globalSearch?: GlobalSearchPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface LensPluginStartDependencies {
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
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
  inspector: InspectorStartContract;
  usageCollection?: UsageCollectionStart;
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
}

export class LensPlugin {
  private datatableVisualization: DatatableVisualizationType | undefined;
  private editorFrameService: EditorFrameServiceType | undefined;
  private createEditorFrame: EditorFrameStart['createInstance'] | null = null;
  private attributeService: (() => Promise<LensAttributeService>) | null = null;
  private indexpatternDatasource: IndexPatternDatasourceType | undefined;
  private xyVisualization: XyVisualizationType | undefined;
  private metricVisualization: MetricVisualizationType | undefined;
  private pieVisualization: PieVisualizationType | undefined;
  private heatmapVisualization: HeatmapVisualizationType | undefined;

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
      globalSearch,
      usageCollection,
    }: LensPluginSetupDependencies
  ) {
    this.attributeService = async () => {
      const { getLensAttributeService } = await import('./async_services');
      const [coreStart, startDependencies] = await core.getStartServices();
      return getLensAttributeService(coreStart, startDependencies);
    };

    const getStartServices = async (): Promise<LensEmbeddableStartServices> => {
      const [coreStart, deps] = await core.getStartServices();

      this.initParts(
        core,
        data,
        embeddable,
        charts,
        expressions,
        usageCollection,
        fieldFormats,
        deps.fieldFormats.deserialize
      );

      return {
        attributeService: await this.attributeService!(),
        capabilities: coreStart.application.capabilities,
        coreHttp: coreStart.http,
        timefilter: deps.data.query.timefilter.timefilter,
        expressionRenderer: deps.expressions.ReactExpressionRenderer,
        documentToExpression: this.editorFrameService!.documentToExpression,
        indexPatternService: deps.data.indexPatterns,
        uiActions: deps.uiActions,
        usageCollection,
      };
    };

    if (embeddable) {
      embeddable.registerEmbeddableFactory('lens', new EmbeddableFactory(getStartServices));
    }

    visualizations.registerAlias(getLensAliasConfig());

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
        const [, deps] = await core.getStartServices();

        await this.initParts(
          core,
          data,
          embeddable,
          charts,
          expressions,
          usageCollection,
          fieldFormats,
          deps.fieldFormats.deserialize
        );

        const { mountApp, stopReportManager } = await import('./async_services');
        this.stopReportManager = stopReportManager;
        await ensureDefaultIndexPattern();
        return mountApp(core, params, {
          createEditorFrame: this.createEditorFrame!,
          attributeService: this.attributeService!,
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

  private async initParts(
    core: CoreSetup<LensPluginStartDependencies, void>,
    data: DataPublicPluginSetup,
    embeddable: EmbeddableSetup | undefined,
    charts: ChartsPluginSetup,
    expressions: ExpressionsServiceSetup,
    usageCollection: UsageCollectionSetup | undefined,
    fieldFormats: FieldFormatsSetup,
    formatFactory: FormatFactory
  ) {
    const {
      DatatableVisualization,
      EditorFrameService,
      IndexPatternDatasource,
      XyVisualization,
      MetricVisualization,
      PieVisualization,
      HeatmapVisualization,
    } = await import('./async_services');
    this.datatableVisualization = new DatatableVisualization();
    this.editorFrameService = new EditorFrameService();
    this.indexpatternDatasource = new IndexPatternDatasource();
    this.xyVisualization = new XyVisualization();
    this.metricVisualization = new MetricVisualization();
    this.pieVisualization = new PieVisualization();
    this.heatmapVisualization = new HeatmapVisualization();
    const editorFrameSetupInterface = this.editorFrameService.setup(core, {
      data,
      embeddable,
      charts,
      expressions,
      usageCollection,
    });
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
    };
    this.indexpatternDatasource.setup(core, dependencies);
    this.xyVisualization.setup(core, dependencies);
    this.datatableVisualization.setup(core, dependencies);
    this.metricVisualization.setup(core, dependencies);
    this.pieVisualization.setup(core, dependencies);
    this.heatmapVisualization.setup(core, dependencies);
    const [coreStart, startDependencies] = await core.getStartServices();
    const frameStart = this.editorFrameService.start(coreStart, startDependencies);
    this.createEditorFrame = frameStart.createInstance;
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

    return {
      EmbeddableComponent: getEmbeddableComponent(core, startDependencies),
      SaveModalComponent: getSaveModalComponent(core, startDependencies, this.attributeService!),
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
    };
  }

  stop() {
    if (this.stopReportManager) {
      this.stopReportManager();
    }
  }
}
