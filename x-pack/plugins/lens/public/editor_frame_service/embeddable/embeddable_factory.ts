/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Capabilities, HttpSetup } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { RecursiveReadonly } from '@kbn/utility-types';
import { Ast } from '@kbn/interpreter/target/common';
import {
  IndexPatternsContract,
  TimefilterContract,
} from '../../../../../../src/plugins/data/public';
import { ReactExpressionRendererType } from '../../../../../../src/plugins/expressions/public';
import {
  EmbeddableFactoryDefinition,
  IContainer,
} from '../../../../../../src/plugins/embeddable/public';
import { LensByReferenceInput, LensEmbeddableInput } from './embeddable';
import { UiActionsStart } from '../../../../../../src/plugins/ui_actions/public';
import { Document } from '../../persistence/saved_object_store';
import { LensAttributeService } from '../../lens_attribute_service';
import { DOC_TYPE } from '../../../common';

export interface LensEmbeddableStartServices {
  timefilter: TimefilterContract;
  coreHttp: HttpSetup;
  attributeService: LensAttributeService;
  capabilities: RecursiveReadonly<Capabilities>;
  expressionRenderer: ReactExpressionRendererType;
  indexPatternService: IndexPatternsContract;
  uiActions?: UiActionsStart;
  documentToExpression: (doc: Document) => Promise<Ast | null>;
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
    return capabilities.visualize.save as boolean;
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
    } = await this.getStartServices();

    const { Embeddable } = await import('../../async_services');

    return new Embeddable(
      {
        attributeService,
        indexPatternService,
        timefilter,
        expressionRenderer,
        editable: await this.isEditable(),
        basePath: coreHttp.basePath,
        getTrigger: uiActions?.getTrigger,
        documentToExpression,
      },
      input,
      parent
    );
  }
}
