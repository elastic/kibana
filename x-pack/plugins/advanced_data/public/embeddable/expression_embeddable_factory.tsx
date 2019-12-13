/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionLoader } from 'src/plugins/expressions/public';
import {
  EmbeddableFactory,
  EmbeddableHandlers,
  GetEmbeddableFactory,
  IContainer,
} from '../../../../../src/plugins/embeddable/public';
import {
  ExpressionEmbeddable,
  EXPRESSION_EMBEDDABLE,
  ExpressionInput,
} from './expression_embeddable';

export class ExpressionEmbeddableFactory extends EmbeddableFactory<ExpressionInput> {
  public readonly type = EXPRESSION_EMBEDDABLE;

  constructor(private expressionLoaderClass: typeof ExpressionLoader) {
    super();
  }

  public isEditable() {
    return true;
  }

  public getDefaultInput() {
    const responseTime = Math.floor(Math.random() * Math.floor(60000));
    const hitCount = Math.floor(Math.random() * Math.floor(100));
    return {
      expression: `demoSearch responseTime=${responseTime} totalHitCount=${hitCount} | render as="debug"`,
    };
  }

  public async create(initialInput: ExpressionInput, parent?: IContainer) {
    return new ExpressionEmbeddable(initialInput, {
      parent,
      createSearchCollector: this.createSearchCollector!,
      ExpressionLoaderClass: this.expressionLoaderClass,
    });
  }

  public getDisplayName() {
    return i18n.translate('embeddableExamples.todo.displayName', {
      defaultMessage: 'Expression embeddable',
    });
  }
}
