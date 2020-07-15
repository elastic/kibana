/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Capabilities, HttpSetup, SavedObjectsClientContract } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { RecursiveReadonly } from '@kbn/utility-types';
import {
  IndexPatternsContract,
  TimefilterContract,
} from '../../../../../../src/plugins/data/public';
import { ReactExpressionRendererType } from '../../../../../../src/plugins/expressions/public';
import {
  EmbeddableFactoryDefinition,
  IContainer,
  AttributeService,
  EmbeddableStart,
} from '../../../../../../src/plugins/embeddable/public';
import {
  Embeddable,
  LensSavedObjectAttributes,
  LensByValueInput,
  LensByReferenceInput,
  LensEmbeddableInput,
} from './embeddable';
import { DOC_TYPE } from '../../persistence';
import { UiActionsStart } from '../../../../../../src/plugins/ui_actions/public';

interface StartServices {
  timefilter: TimefilterContract;
  coreHttp: HttpSetup;
  capabilities: RecursiveReadonly<Capabilities>;
  savedObjectsClient: SavedObjectsClientContract;
  expressionRenderer: ReactExpressionRendererType;
  indexPatternService: IndexPatternsContract;
  embeddable: EmbeddableStart;
  uiActions?: UiActionsStart;
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

  constructor(private getStartServices: () => Promise<StartServices>) {}

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
    return this.create(input, parent);
  };

  async create(input: LensEmbeddableInput, parent?: IContainer) {
    const {
      timefilter,
      expressionRenderer,
      uiActions,
      coreHttp,
      indexPatternService,
      embeddable,
    } = await this.getStartServices();
    return new Embeddable(
      {
        attributeService: embeddable.getAttributeService<
          LensSavedObjectAttributes,
          LensByValueInput,
          LensByReferenceInput
        >(this.type),
        indexPatternService,
        timefilter,
        expressionRenderer,
        editable: await this.isEditable(),
        basePath: coreHttp.basePath,
        getTrigger: uiActions?.getTrigger,
      },
      input,
      parent
    );
  }
}
