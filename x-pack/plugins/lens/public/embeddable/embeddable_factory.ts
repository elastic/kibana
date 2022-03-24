/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities, HttpSetup, ThemeServiceStart } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { RecursiveReadonly } from '@kbn/utility-types';
import { Ast } from '@kbn/interpreter';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import { FilterManager, TimefilterContract } from '../../../../../src/plugins/data/public';
import type { DataViewsContract } from '../../../../../src/plugins/data_views/public';
import { ReactExpressionRendererType } from '../../../../../src/plugins/expressions/public';
import {
  EmbeddableFactoryDefinition,
  IContainer,
} from '../../../../../src/plugins/embeddable/public';
import { LensByReferenceInput, LensEmbeddableInput } from './embeddable';
import { UiActionsStart } from '../../../../../src/plugins/ui_actions/public';
import { Start as InspectorStart } from '../../../../../src/plugins/inspector/public';
import { Document } from '../persistence/saved_object_store';
import { LensAttributeService } from '../lens_attribute_service';
import { DOC_TYPE } from '../../common/constants';
import { ErrorMessage } from '../editor_frame_service/types';
import { extract, inject } from '../../common/embeddable_factory';
import type { SpacesPluginStart } from '../../../spaces/public';
import { VisualizationMap } from '../types';

export interface LensEmbeddableStartServices {
  timefilter: TimefilterContract;
  coreHttp: HttpSetup;
  inspector: InspectorStart;
  attributeService: LensAttributeService;
  capabilities: RecursiveReadonly<Capabilities>;
  expressionRenderer: ReactExpressionRendererType;
  indexPatternService: DataViewsContract;
  uiActions?: UiActionsStart;
  usageCollection?: UsageCollectionSetup;
  documentToExpression: (
    doc: Document
  ) => Promise<{ ast: Ast | null; errors: ErrorMessage[] | undefined }>;
  injectFilterReferences: FilterManager['inject'];
  visualizationMap: VisualizationMap;
  spaces?: SpacesPluginStart;
  theme: ThemeServiceStart;
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
      defaultMessage: 'lens',
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
    const {
      timefilter,
      expressionRenderer,
      documentToExpression,
      injectFilterReferences,
      visualizationMap,
      uiActions,
      coreHttp,
      attributeService,
      indexPatternService,
      capabilities,
      usageCollection,
      theme,
      inspector,
      spaces,
    } = await this.getStartServices();

    const { Embeddable } = await import('../async_services');

    return new Embeddable(
      {
        attributeService,
        indexPatternService,
        timefilter,
        inspector,
        expressionRenderer,
        basePath: coreHttp.basePath,
        getTrigger: uiActions?.getTrigger,
        getTriggerCompatibleActions: uiActions?.getTriggerCompatibleActions,
        documentToExpression,
        injectFilterReferences,
        visualizationMap,
        capabilities: {
          canSaveDashboards: Boolean(capabilities.dashboard?.showWriteControls),
          canSaveVisualizations: Boolean(capabilities.visualize.save),
        },
        usageCollection,
        theme,
        spaces,
      },
      input,
      parent
    );
  }

  extract = extract;
  inject = inject;
}
