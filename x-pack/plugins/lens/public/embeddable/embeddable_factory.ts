/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Capabilities,
  CoreStart,
  HttpSetup,
  IUiSettingsClient,
  ThemeServiceStart,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { RecursiveReadonly } from '@kbn/utility-types';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { DataPublicPluginStart, FilterManager, TimefilterContract } from '@kbn/data-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import { ReactExpressionRendererType } from '@kbn/expressions-plugin/public';
import {
  EmbeddableFactoryDefinition,
  IContainer,
  ErrorEmbeddable,
} from '@kbn/embeddable-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { Start as InspectorStart } from '@kbn/inspector-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { LensByReferenceInput, LensEmbeddableInput } from './embeddable';
import type { Document } from '../persistence/saved_object_store';
import type { LensAttributeService } from '../lens_attribute_service';
import { DOC_TYPE } from '../../common/constants';
import { extract, inject } from '../../common/embeddable_factory';
import type { DatasourceMap, VisualizationMap } from '../types';
import type { DocumentToExpressionReturnType } from '../editor_frame_service/editor_frame';

export interface LensEmbeddableStartServices {
  data: DataPublicPluginStart;
  timefilter: TimefilterContract;
  coreHttp: HttpSetup;
  coreStart: CoreStart;
  inspector: InspectorStart;
  attributeService: LensAttributeService;
  capabilities: RecursiveReadonly<Capabilities>;
  expressionRenderer: ReactExpressionRendererType;
  dataViews: DataViewsContract;
  uiActions?: UiActionsStart;
  usageCollection?: UsageCollectionSetup;
  documentToExpression: (doc: Document) => Promise<DocumentToExpressionReturnType>;
  injectFilterReferences: FilterManager['inject'];
  visualizationMap: VisualizationMap;
  datasourceMap: DatasourceMap;
  spaces?: SpacesPluginStart;
  theme: ThemeServiceStart;
  uiSettings: IUiSettingsClient;
}

export class EmbeddableFactory implements EmbeddableFactoryDefinition {
  type = DOC_TYPE;
  savedObjectMetaData = {
    name: i18n.translate('xpack.lens.lensSavedObjectLabel', {
      defaultMessage: 'Lens Visualization',
    }),
    type: DOC_TYPE,
    getIconForSavedObject: () => 'lensApp',
  };

  constructor(private getStartServices: () => Promise<LensEmbeddableStartServices>) {}

  public isEditable = async () => {
    const { capabilities } = await this.getStartServices();
    return Boolean(capabilities.visualize.save || capabilities.dashboard?.showWriteControls);
  };

  canCreateNew() {
    return false;
  }

  getDisplayName() {
    return i18n.translate('xpack.lens.embeddableDisplayName', {
      defaultMessage: 'Lens',
    });
  }

  createFromSavedObject = async (
    savedObjectId: string,
    input: LensEmbeddableInput,
    parent?: IContainer
  ) => {
    if (!(input as LensByReferenceInput).savedObjectId) {
      (input as LensByReferenceInput).savedObjectId = savedObjectId;
    }
    return this.create(input, parent);
  };

  async create(input: LensEmbeddableInput, parent?: IContainer) {
    try {
      const {
        data,
        timefilter,
        expressionRenderer,
        documentToExpression,
        injectFilterReferences,
        visualizationMap,
        datasourceMap,
        uiActions,
        coreHttp,
        coreStart,
        attributeService,
        dataViews,
        capabilities,
        usageCollection,
        inspector,
        spaces,
        uiSettings,
      } = await this.getStartServices();

      const { Embeddable } = await import('../async_services');

      return new Embeddable(
        {
          attributeService,
          data,
          dataViews,
          timefilter,
          inspector,
          expressionRenderer,
          basePath: coreHttp.basePath,
          getTrigger: uiActions?.getTrigger,
          getTriggerCompatibleActions: uiActions?.getTriggerCompatibleActions,
          documentToExpression,
          injectFilterReferences,
          visualizationMap,
          datasourceMap,
          capabilities: {
            canSaveDashboards: Boolean(capabilities.dashboard?.showWriteControls),
            canSaveVisualizations: Boolean(capabilities.visualize.save),
            canOpenVisualizations: Boolean(capabilities.visualize.show),
            navLinks: capabilities.navLinks,
            discover: capabilities.discover,
          },
          coreStart,
          usageCollection,
          spaces,
          uiSettings,
        },
        input,
        parent
      );
    } catch (e) {
      return new ErrorEmbeddable(e, input, parent);
    }
  }

  extract = extract;
  inject = inject;
}
