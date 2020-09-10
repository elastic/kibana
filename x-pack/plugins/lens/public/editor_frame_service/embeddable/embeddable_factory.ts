/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Capabilities, HttpSetup, SavedObjectsClientContract } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { RecursiveReadonly } from '@kbn/utility-types';
import { toExpression, Ast } from '@kbn/interpreter/target/common';
import {
  IndexPatternsContract,
  IndexPattern,
  TimefilterContract,
} from '../../../../../../src/plugins/data/public';
import { ReactExpressionRendererType } from '../../../../../../src/plugins/expressions/public';
import {
  EmbeddableFactoryDefinition,
  ErrorEmbeddable,
  EmbeddableInput,
  IContainer,
} from '../../../../../../src/plugins/embeddable/public';
import { Embeddable } from './embeddable';
import { SavedObjectIndexStore, DOC_TYPE } from '../../persistence';
import { getEditPath } from '../../../common';
import { UiActionsStart } from '../../../../../../src/plugins/ui_actions/public';
import { Document } from '../../persistence/saved_object_store';

interface StartServices {
  timefilter: TimefilterContract;
  coreHttp: HttpSetup;
  capabilities: RecursiveReadonly<Capabilities>;
  savedObjectsClient: SavedObjectsClientContract;
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
    input: Partial<EmbeddableInput> & { id: string },
    parent?: IContainer
  ) => {
    const {
      savedObjectsClient,
      coreHttp,
      indexPatternService,
      timefilter,
      expressionRenderer,
      documentToExpression,
      uiActions,
    } = await this.getStartServices();
    const store = new SavedObjectIndexStore(savedObjectsClient);
    const savedVis = await store.load(savedObjectId);

    const promises = savedVis.references
      .filter(({ type }) => type === 'index-pattern')
      .map(async ({ id }) => {
        try {
          return await indexPatternService.get(id);
        } catch (error) {
          // Unable to load index pattern, ignore error as the index patterns are only used to
          // configure the filter and query bar - there is still a good chance to get the visualization
          // to show.
          return null;
        }
      });
    const indexPatterns = (
      await Promise.all(promises)
    ).filter((indexPattern: IndexPattern | null): indexPattern is IndexPattern =>
      Boolean(indexPattern)
    );

    const expression = await documentToExpression(savedVis);

    return new Embeddable(
      timefilter,
      expressionRenderer,
      uiActions?.getTrigger,
      {
        savedVis,
        editPath: getEditPath(savedObjectId),
        editUrl: coreHttp.basePath.prepend(`/app/lens${getEditPath(savedObjectId)}`),
        editable: await this.isEditable(),
        indexPatterns,
        expression: expression ? toExpression(expression) : null,
      },
      input,
      parent
    );
  };

  async create(input: EmbeddableInput) {
    return new ErrorEmbeddable('Lens can only be created from a saved object', input);
  }
}
