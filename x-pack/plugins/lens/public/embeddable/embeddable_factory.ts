/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { Ast } from '@kbn/interpreter/common';
import type { RecursiveReadonly } from '@kbn/utility-types';
import type { HttpSetup } from '../../../../../src/core/public/http/types';
import type { Capabilities } from '../../../../../src/core/types/capabilities';
import type { IndexPatternsContract } from '../../../../../src/plugins/data/common/index_patterns/index_patterns/index_patterns';
import type { TimefilterContract } from '../../../../../src/plugins/data/public/query/timefilter/timefilter';
import type { IContainer } from '../../../../../src/plugins/embeddable/public/lib/containers/i_container';
import type { EmbeddableFactoryDefinition } from '../../../../../src/plugins/embeddable/public/lib/embeddables/embeddable_factory_definition';
import type { ReactExpressionRendererType } from '../../../../../src/plugins/expressions/public/react_expression_renderer';
import type { UiActionsStart } from '../../../../../src/plugins/ui_actions/public/plugin';
import type { UsageCollectionSetup } from '../../../../../src/plugins/usage_collection/public/plugin';
import { DOC_TYPE } from '../../common/constants';
import { extract, inject } from '../../common/embeddable_factory';
import type { ErrorMessage } from '../editor_frame_service/types';
import type { LensAttributeService } from '../lens_attribute_service';
import type { Document } from '../persistence/saved_object_store';
import type { LensByReferenceInput, LensEmbeddableInput } from './embeddable';

export interface LensEmbeddableStartServices {
  timefilter: TimefilterContract;
  coreHttp: HttpSetup;
  attributeService: LensAttributeService;
  capabilities: RecursiveReadonly<Capabilities>;
  expressionRenderer: ReactExpressionRendererType;
  indexPatternService: IndexPatternsContract;
  uiActions?: UiActionsStart;
  usageCollection?: UsageCollectionSetup;
  documentToExpression: (
    doc: Document
  ) => Promise<{ ast: Ast | null; errors: ErrorMessage[] | undefined }>;
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
      uiActions,
      coreHttp,
      attributeService,
      indexPatternService,
      capabilities,
      usageCollection,
    } = await this.getStartServices();

    const { Embeddable } = await import('../async_services');

    return new Embeddable(
      {
        attributeService,
        indexPatternService,
        timefilter,
        expressionRenderer,
        basePath: coreHttp.basePath,
        getTrigger: uiActions?.getTrigger,
        getTriggerCompatibleActions: uiActions?.getTriggerCompatibleActions,
        documentToExpression,
        capabilities: {
          canSaveDashboards: Boolean(capabilities.dashboard?.showWriteControls),
          canSaveVisualizations: Boolean(capabilities.visualize.save),
        },
        usageCollection,
      },
      input,
      parent
    );
  }

  extract = extract;
  inject = inject;
}
